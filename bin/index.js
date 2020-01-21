#!/usr/bin/env node
var _transifex = require("../transifex");

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _mkpath = require("mkpath");

var _mkpath2 = _interopRequireDefault(_mkpath);

var _commander = require("commander");

var _commander2 = _interopRequireDefault(_commander);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var source_language = false,
    meta = false;

// write files by the given path and locale
function writeFile(relPath, strings, locale, callback) {
  callback = callback || function () {};
  var absPath = _path2.default.join(dirName, relPath);
  (0, _mkpath2.default)(_path2.default.dirname(absPath), function (err) {
    if (err) {
      return callback(err);
    }
    _fs2.default.writeFile(absPath, strings, { encoding: "utf-8" }, callback);
  });
}

function failed(err) {
  console.error(err);
  process.exit(1);
}

function importFromTransifex(options) {
  // Retrieve all the data e.g. resource names, category names
  transifex.resourcesSetMethod(projectName, function (error, data) {
    if (error) {
      failed(error);
    }

    // Retrieve all the supported languages
    transifex.projectInstanceMethods(projectName, function (error, languages) {
      if (error) {
        failed(error);
      }

      var index = languages.teams.indexOf(languages.source_language_code);
      // if we select `-s` option then add source language to the list to download
      if (source_language && index < 0) {
        languages.teams.push(languages.source_language_code);
      } else if (!source_language) {
        if (index > -1) {
          languages.teams.splice(index, 1);
        }
      }

      // We are going to iterate through all the languages first before calling the function
      var wait = languages.teams.length;

      // Check if there is more than one resource with the same category
      resources = data.filter(function (v) {
        if (v.categories !== null) {
          if (v.categories.indexOf(categoryName) !== -1) {
            return true;
          }
        }
      });

      if (!resources.length) {
        failed("Error: Please check your category name");
      }

      var i = resources.length - 1;
      resources.forEach(function (resource) {
        if (meta) {
          transifex.statisticsMethods(projectName, resource.slug, function (err, data) {
            // Write each file with the given filename and content.
            Object.keys(data).forEach(function (language) {
              writeFile(_path2.default.join(language, "meta-" + resource.name + ".json"), JSON.stringify(data[language], null, 2), function (err) {
                if (err) {
                  throw new Error(err);
                }
              });
            });
          });
        }

        languages.teams.forEach(function (language) {
          // Request the file for the specified locale then write the file
          transifex.translationInstanceMethod(projectName, resource.slug, language, function (err, fileContent, type) {
            if (err) {
              throw new Error(err);
            }
            var filename = _path2.default.join(language, resource.name + "." + type);
            wait--;
            // Write each file with the given filename and content.
            writeFile(filename, fileContent, function (err) {
              if (err) {
                throw new Error(err);
              }
            });
            if (wait === 0) {
              i--;
              wait = languages.teams.length;
              if (i < 0) {
                console.log("Transifex: Download completed");
                process.exit(0);
              }
            }
          });
        });
      });
    });
  });
}

function main() {
  _commander2.default.option('-u, --credential <user:pass>', 'specify a Transifex username and password in the form username:password').option('-p, --project <slug>', 'specify project slug').option('-c, --category <name>', 'specify project category name').option('-d, --dir <path>', 'locale dir for the downloaded files').option('-s, --source_language', 'override source_language (false by default)').option('-m, --meta', 'download meta info files (false by default)').parse(process.argv);
  if (!_commander2.default.credential) {
    failed("Bad Config - Please specify your Transifex's credential");
  } else {
    userAuth = _commander2.default.credential;
  }
  if (!_commander2.default.project) {
    failed("Bad Config - Please specify your project slug's name");
  } else {
    projectName = _commander2.default.project;
  }
  if (!_commander2.default.category) {
    failed("Bad Config - Please specify your project category's name");
  } else {
    categoryName = _commander2.default.category;
  }
  if (!_commander2.default.dir) {
    failed("Bad Config - Please specify the path for the downloaded files");
  } else {
    dirName = _commander2.default.dir;
  }
  if (_commander2.default.source_language) {
    source_language = true;
  }
  if (_commander2.default.meta) {
    meta = true;
  }
  transifex = new _transifex.Transifex({ credential: userAuth, project_slug: projectName });
  importFromTransifex(_commander2.default);
}

if (!module.parent) {
  main();
}
