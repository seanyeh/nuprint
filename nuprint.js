#!/usr/bin/env phantomjs
/**
 * nuprint.js
 * Sean Yeh
 *
 * A script for printing documents to Northwestern's printers from the command line.
 *
 * Run with -h or --help for help.
 *
 * License: Do whatever you want with it. If you like it, plesae let me know!
 * Requires: PhantomJS
 */

var system = require('system');

// URLs and Printers
var BASE_URL = "https://printing.northwestern.edu:9192";
var HOME_URL = BASE_URL + "/user";
var PRINT_URL = BASE_URL + "/app?service=action/1/UserWebPrint/0/$ActionLink";
var JOBS_URL = BASE_URL + "/app?service=page/UserWebPrint";

var PRINTERS = {
    "ev-lawprint\\PRT_PUB_BW (virtual)": "Law School - Library/Student Services B&W - One-sided",
    "ev-lawprint\\PRT_PUB_BW-DUPLEX (virtual)": "Law School - Library/Student Services B&W - Two-sided",
    "ev-lawprint\\COP_PUB_L20C": "Law School - Library L215 Color Copier - One-sided",
    "ev-lawprint\\COP_PUB_L270C-DUPLEX": "Law School - Library L215 Color Copier - Two-sided",
    "ev-lawprint\\COP_PUB_LMB3": "Law School - Levy Mayer Basement Room3 B&W - One-sided",
    "ev-lawprint\\COP_PUB_LMB3-DUPLEX": "Law School - Levy Mayer Basement Room3 B&W - Two-sided",
    "ev-lawprint\\PRT_PUB_Interview_Color": "Law School - Student Services Color - One-sided",
    "ev-lawprint\\PRT_PUB_Interview_Color-DUPLEX": "Law School - Student Services Color - Two-sided",

    "ev-print\\BW (virtual)": "NUL Libraries - B&W simplex",
    "ev-print\\BW-DUPLEX (virtual)": "NUL Libraries - B&W duplex",
    "ev-print\\COLOR (virtual)": "NUL Libraries - Color simplex",
    "ev-print\\COLOR-DUPLEX (virtual)": "NUL Libraries - Color duplex",

    "galterprint\\Single Sided B&W (virtual)": "Galter Medical Library - Single Sided B&W",
    "galterprint\\Single Sided Color (virtual)": "Galter Medical Library - Single Sided Color",
    "galterprint\\Double Sided B&W (virtual)": "Galter Medical Library - Double Sided B&W",
    "galterprint\\Double Sided Color (virtual)": "Galter Medical Library - Double Sided Color",

    "saf-print\\BW (virtual)": "Student Affairs - B&W simplex",
    "saf-print\\BW_DUPLEX (virtual)": "Student Affairs - B&W duplex",
    "saf-print\\COLOR (virtual)": "Student Affairs - Color simplex",
    "saf-print\\COLOR_DUPLEX (virtual)": "Student Affairs - Color duplex",

    "vcprinter2\\Lab_415_bw_vc": "School of Continuing Education - BT_415 Lab BW",
    "vcprinter2\\WBT_415_Color_vc1": "School of Continuing Education - BT_415 Lab Color",
    "vcprinter2\\WBT_411_BW_vc": "School of Continuing Education - BT_411_Lounge BW",
    "vcprinter2\\Loop_HP4250_north_vc": "School of Continuing Education - Loop_HP4250_North",

    "vmpapercut\\Loop_HP4250_North": "vmpapercut\\Loop_HP4250_North",
    "vmpapercut\\WBT_411_BW_PS": "vmpapercut\\WBT_411_BW_PS",
    "vmpapercut\\WBT_415_BW_PCL": "vmpapercut\\WBT_415_BW_PCL",
    "vmpapercut\\wbt_415_color_PCL": "vmpapercut\\wbt_415_color_PCL",
};

var CONFIG = {};

function ASSERT(val, desc){
    if (!val){
        EXIT("ASSERT failed: " + desc);
    }
}

function EXIT(msg){
    console.error(msg);
    phantom.exit(1);
}

function LOG(msg){
    if (CONFIG.verbose){
        console.log(msg);
    }
}

/*
 * WebPage singleton
 */
function getPage(){
    var self = getPage;
    if (!self.instance){
        self.isLoading = false;

        self.instance = new WebPage();

        self.instance.onConsoleMessage = function(msg){
            if (CONFIG.verbose){
                console.log(msg);
            }
        };

        self.instance.onLoadStarted = function(){
            self.isLoading = true;
        };

        self.instance.onLoadFinished = function(){
            self.isLoading = false;
        };
    }
    return self.instance;
}

/*
 * Automation steps
 */
function genLoginSteps(env){
    var username = env.NUPRINT_USERNAME;
    var password = env.NUPRINT_PASSWORD;

    return [
        function() {
            //Load Login Page
            getPage().open(HOME_URL);
        },
        function() {
            LOG("Logging in...");
            //Enter Credentials
            getPage().evaluate(function(username, password) {
                var inputUser = document.getElementById("inputUsername");
                var inputPassword = document.getElementById("inputPassword");
                var form = document.querySelectorAll("form")[0];

                inputUser.value = username;
                inputPassword.value = password;

                form.submit();
                return;
            }, username, password);
        }
    ];
}

function genPrintingSteps(filename){
    return [
        function(){
            getPage().open(PRINT_URL);
        },

        function(){
            var status = getPage().evaluate(function(printer){
                var form = document.querySelectorAll("form")[0];

                var elements = document.querySelectorAll(".displayNameColumnValue > label");

                for (var i = 0; i < elements.length; i++){
                    var curPrinter = elements[i].innerText.trim().replace("\n", "");

                    if (curPrinter === printer){
                        console.log("Printer found");

                        // HACK: I think this is because there are 7 non-input
                        // elements in the form before the first input,
                        // so the first input is at i=7
                        form.elements[i + 7].checked = true;
                        form.submit();
                        return true;
                    }
                }
                return false;
            }, CONFIG.printer);

            ASSERT(status, "Find printer");
        },

        function(){
            var title = getPage().evaluate(function(copies){
                var title = document.title;
                // Set number of copies
                var input = document.querySelector("input[name='copies']");
                input.value = copies;

                var buttons = document.querySelectorAll(".buttons")[0];
                buttons.children[0].click();

                return title;
            }, CONFIG.copies);

            ASSERT(title === "PaperCut MF : Web Print - Step 2 - Print Options and Account Selection",
                   "Copies page");
        },

        // Upload
        function(){
            LOG("Uploading file");
            getPage().uploadFile("#upload-input", filename);
        },

        function(){
            getPage().evaluate(function(){
                var buttons = document.querySelectorAll(".buttons")[0];
                buttons.children[1].click();
            });
        },

        function(){
            var title = getPage().evaluate(function() {
                return document.title;
            });

            if (title === "PaperCut MF : Web Print - Step 3 - Upload Documents"){
                EXIT("Error in upload");
            } else{
                LOG("Upload done.");
            }
        },
    ];
}

var LISTJOBS_STEPS = [
    function(){
        getPage().open(JOBS_URL);
    },

    function(){
        getPage().evaluate(function(){
            var map = Array.prototype.map;
            var getInnerText = function(item){ return item.innerText.trim(); };

            var columnNames = [
                ".submitTime",
                ".printer",
                ".documentName",
                ".pages",
                ".cost",
                ".status"
            ].map(function(item){ return item + "ColumnValue"; });

            var columns = [];

            for (var i = 0; i < columnNames.length; i++){
                columns[i] = Array.prototype.map.call(
                        document.querySelectorAll(columnNames[i]),
                        getInnerText);
            }

            var s;
            for (var i = 0; i < columns[0].length; i++){
                s = "";
                for (var j = 0; j < columnNames.length; j++){
                    s += columns[j][i] + " | ";
                }

                console.log(s.trim());
            }
        });
    }
];

function run(steps){
    var stepIndex = 0;
    setInterval(function(){
        if (!getPage.isLoading){
            steps[stepIndex]();
            stepIndex++;
        }

        if (stepIndex >= steps.length){
            phantom.exit();
        }
    }, 100);
}


/*
 * Argument Parser
 * Inspired by python argparse
 */
function ArgumentParser(argRules, usageString){
    var DEFAULT_ARGS = {
        type: "str",
        boolFlag: false
    };

    this.rules = {};

    // Create help string
    this.helpString = usageString + "\n\n";
    for (var i = 0; i < argRules.length; i++){
        var rule = argRules[i];

        var flags = rule.flags.join("\t");
        var desc = rule.help;
        if ("default" in rule){
            desc += " Default: " + rule.default;
        }

        this.helpString += "  " + flags + "\t" + desc + "\n";
    }

    // Iterate each rule
    for (var i = 0; i < argRules.length; i++){
        var rule = argRules[i];

        // Apply default fields
        for (var k in DEFAULT_ARGS){
            if (typeof rule[k] === "undefined"){
                rule[k] = DEFAULT_ARGS[k];
            }
        }

        // Add to this.rules
        for (var j = 0; j < rule.flags.length; j++){
            var flag = rule.flags[j];
            this.rules[flag] = rule;
        }
    }
}

ArgumentParser.TYPES = {
    "str": String,
    "int": function(x){
        var parsed = parseInt(x, 10);
        if (String(x) !== String(parsed) || parsed <= 0){
            EXIT("Argument is not a positive integer");
        } else{
            return parsed;
        }
    }
};

ArgumentParser.genTypeFunc = function(type){
    if (typeof type === "string"){
        var typeFunc = ArgumentParser.TYPES[type];
        if (!typeFunc){
            EXIT("Type \"" + type + "\" is not a valid type.");
        } else{
            return typeFunc;
        }
    }
    // Custom type function
    else if (typeof type === "function"){
        return type;
    }
    else{
        EXIT("Unrecognized type: " + type +". Type should be either a string or a function");
    }
};

ArgumentParser.prototype._setFlag = function(config, flag, val){
    var flagList = this.rules[flag].flags;

    for (var i = 0; i < flagList.length; i++){
        var f = flagList[i];

        // Remove first (and possibly second) hypen
        // and replace other hyphens with underscores
        f = f.replace(/^\-\-?/, "").replace("-", "_");

        config[f] = val;
    }
};

ArgumentParser.prototype.printHelp = function(){
    console.log(this.helpString);
}

/*
 * Return a config object
 */
ArgumentParser.prototype.parseArgs = function(args){
    var config = {files:[]};
    var currentFlag = null;

    // First apply defaults
    for (var flag in this.rules){
        var rule = this.rules[flag];
        if ("default" in rule){
            var firstFlag = rule.flags[0];
            this._setFlag(config, firstFlag, rule.default);
        }
    }

    // Now iterate args
    for (var i = 0; i < args.length; i++){
        var token = args[i];

        // If help
        if (token === "-h" || token === "--help"){
            this.printHelp();
            phantom.exit(0);
            return;
        }

        // If previous token was a flag
        if (currentFlag !== null){
            var typeName = this.rules[currentFlag].type;
            var typeFunc = ArgumentParser.genTypeFunc(typeName);

            this._setFlag(config, currentFlag, typeFunc(token));

            currentFlag = null;
        }

        // If valid flag (currentFlag === null)
        else if (this.rules[token]){

            // If is boolFlag, set to True in config
            if (this.rules[token].boolFlag){
                this._setFlag(config, token, true);
            }

            // Set currentFlag and read next Token
            else{
                currentFlag = token;

                // if currentFlag is the last token, then there is no value
                if (i === args.length - 1){
                    EXIT("Flag '" + currentFlag + "' requires an argument.");
                }
            }
        }
        // Invalid flag
        else if (token[0] === "-"){
            EXIT("Invalid flag: " + token);
        }

        // Just your normal file
        else{
            config.files.push(token);
        }
    }

    return config;
};


/*
 * Available tasks
 */
function printJobs(env){
    var printingSteps = [];
    ASSERT(CONFIG.files.length >= 1, "No files provided");
    for (var i = 0; i < CONFIG.files.length; i++){
        var filename = CONFIG.files[i];
        printingSteps = printingSteps.concat(genPrintingSteps(filename));
    }

    var steps = genLoginSteps(env).concat(printingSteps, LISTJOBS_STEPS);
    run(steps);
}

function listJobs(env){
    var steps = genLoginSteps(env).concat(LISTJOBS_STEPS);
    run(steps);
}


/*
 * Main - setup arg parser
 */
function main(env){
    var args = require("system").args.slice(1);

    var argRules = [
        {
            flags: ["-v", "--verbose"],
            help: "Set verbosity.",
            boolFlag: true
        },

        // Printing options
        {
            flags: ["-p", "--printer"],
            help: "Name of printer.",
            type: function(name){
                if (!(name in PRINTERS)){
                    EXIT("Printer does not exist: " + name);
                } else{
                    return name;
                }
            }
        },
        {
            flags: ["-c", "--copies"],
            help: "Number of copies.",
            type: "int",
            default: 1
        },
        {
            flags: ["--no-confirm"],
            help: "Do not ask for confirmation.",
            boolFlag: true
        },

        // Tasks
        {
            flags: ["--list-printers"],
            help: "Show the list of printer descriptions and names.",
            boolFlag: true
        },
        {
            flags: ["--list-jobs"],
            help: "Show the list of your current print jobs.",
            boolFlag: true
        },
    ];

    var argParser = new ArgumentParser(argRules, "nuprint.js [OPTIONS] FILE1 [FILE2 ...]");
    CONFIG = argParser.parseArgs(args);

    LOG(JSON.stringify(CONFIG));

    if (CONFIG.list_printers){
        console.log("Printer description: Printer name\n");
        for (var printerName in PRINTERS){
            console.log(PRINTERS[printerName] + ": \"" + printerName + "\"");
        }
        phantom.exit(0);
    }
    else if (CONFIG.list_jobs){
        listJobs(env);

    }
    // If files or printers not specified, print help
    else if (! ("printer" in CONFIG && files.length > 0)){
        argParser.printHelp();
        phantom.exit(0);
    }
    else {

        // Ask for confirmation first
        if (!CONFIG.no_confirm){
            console.log("Below is a summary of your print job.");
            console.log("  files: " + CONFIG.files);
            console.log("  copies: " + CONFIG.copies);
            console.log("  printer: " + CONFIG.printer);

            console.log("Do you want to proceed? [Y/n]");
            line = system.stdin.readLine();

            if (line !== "y" && line !== "Y" && line !== ""){
                phantom.exit(0);
                return;
            }
        }

        printJobs(env);
    }
}

main(system.env);
