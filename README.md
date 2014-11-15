# nuprint

By Sean Yeh

A script for printing documents to Northwestern's printers from the command line.

Disclaimer: Besides being a student there, I'm not affiliated with Northwestern in
any way. Don't sue me :)

## Requirements
You must have [PhantomJS](http://phantomjs.org/download.html) installed.

The easiest way is to install it from your software repositories (on Linux) or with brew (OS X). If you're on Windows, install it somewhere and set your path right (sorry can't help you there).

## Installation
#### *nix
* Download nuprint.js to somewhere in your PATH
* Run `chmod +x nuprint.js`

#### Windows
* Download nuprint.js
* Note that you'll have to run "phantomjs \path\to\nuprint.js" instead of the "nuprint.js" you see in the usage below. You'll also have to set your login credentials as environment variables differently, I presume. I've never tested on windows so good luck.
 
## Usage

Login credentials are set using environment variables (NUPRINT_USERNAME and NUPRINT_PASSWORD).

Print file1.pdf from NU library printers (2 copies) (requires login):
```shell
NUPRINT_USERNAME="myusername" NUPRINT_PASSWORD="mypass" nuprint.js --printer "ev-print\BW" --copies 2 file1.pdf
```

Print multiple files (requires login):
```shell
NUPRINT_USERNAME="myusername" NUPRINT_PASSWORD="mypass" nuprint.js --printer "ev-print\BW" file1.pdf file2.doc file3.ppt
```

List available printers:
```shell
nuprint.js --list-printers
```

List your print jobs (requires login):
```shell
NUPRINT_USERNAME="myusername" NUPRINT_PASSWORD="mypass" nuprint.js --list-jobs
```

For more help:
```shell
nuprint.js --help
```

## License

Do whatever you want with it

(Also, don't sue me if something doesn't work)
