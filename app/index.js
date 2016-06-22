var _ = require('lodash');
var extend = _.merge;
var generators = require('yeoman-generator');
var path = require('path');
var askName = require('inquirer-npm-name');
var githubUsername = require('github-username');


module.exports = generators.Base.extend({
    initializing: function () {
        this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

        // Pre set the default props from the information we have at this point
        this.props = {
            name: this.pkg.name,
            description: this.pkg.description,
            version: this.pkg.version,
            homepage: this.pkg.homepage
            //   babel: Boolean(this.options.babel)
        };

        if (_.isObject(this.pkg.author)) {
            this.props.authorName = this.pkg.author.name;
            this.props.authorEmail = this.pkg.author.email;
            this.props.authorUrl = this.pkg.author.url;
        } else if (_.isString(this.pkg.author)) {
            var info = parseAuthor(this.pkg.author);
            this.props.authorName = info.name;
            this.props.authorEmail = info.email;
            this.props.authorUrl = info.url;
        }
    },

    prompting: {
        askForModuleName: function () {
            var done = this.async();
            askName({
                name: 'name',
                message: 'Module Name',
                default: path.basename(process.cwd()),
                filter: _.kebabCase,
                validate: function (str) {
                    return str.length > 0;
                }
            }, this, function (name) {
                this.props.name = name;
                done();
            }.bind(this));
        },

        askFor: function () {
            var done = this.async();

            var prompts = [{
                name: 'description',
                message: 'Description',
                when: !this.props.description
            }, {
                    name: 'homepage',
                    message: 'Project homepage url',
                    when: !this.props.homepage
                }, {
                    name: 'authorName',
                    message: 'Author\'s Name',
                    when: !this.props.authorName,
                    default: this.user.git.name(),
                    store: true
                }, {
                    name: 'authorEmail',
                    message: 'Author\'s Email',
                    when: !this.props.authorEmail,
                    default: this.user.git.email(),
                    store: true
                }, {
                    name: 'authorUrl',
                    message: 'Author\'s Homepage',
                    when: !this.props.authorUrl,
                    store: true
                }, {
                    name: 'keywords',
                    message: 'Package keywords (comma to split)',
                    when: !this.pkg.keywords,
                    filter: function (words) {
                        return words.split(/\s*,\s*/g);
                    }
                }];

            this.prompt(prompts, function (props) {
                this.props = extend(this.props, props);
                done();
            }.bind(this));
        },

        askForGithubAccount: function () {
            if (this.options.githubAccount) {
                this.props.githubAccount = this.options.githubAccount;
            } else {
                var done = this.async();

                githubUsername(this.props.authorEmail, function (err, username) {
                    if (err) {
                        username = username || '';
                    }
                    this.prompt({
                        name: 'githubAccount',
                        message: 'GitHub username or organization',
                        default: username
                    }, function (prompt) {
                        this.props.githubAccount = prompt.githubAccount;
                        done();
                    }.bind(this));
                }.bind(this));
            }
        }
    },

    writing: {
        npm: function () {
            var currentPkg = this.fs.readJSON(this.destinationPath('package.json'), {});

            var pkg = extend({
                name: _.kebabCase(this.props.name),
                version: '0.0.0',
                description: this.props.description,
                homepage: this.props.homepage,
                author: {
                    name: this.props.authorName,
                    email: this.props.authorEmail,
                    url: this.props.authorUrl
                },
                keywords: []
            }, currentPkg);

            // Combine the keywords
            if (this.props.keywords) {
                pkg.keywords = _.uniq(this.props.keywords.concat(pkg.keywords));
            }

            // Let's extend package.json so we're not overwriting user previous fields
            this.fs.writeJSON(this.destinationPath('package.json'), pkg);
        },

        templates: function () {
            var templates = [
                '.gitignore',
                'tsconfig.json',
                'tslint.json',
                'typingsrc',
                '.vscode/settings.json',
                '.vscode/tasks.json'];
            for (template of templates) {
                var src = this.templatePath(template);
                var dest = this.destinationPath(template);
                // this.log(`Writing ${src} to ${dest}`);
                this.fs.copyTpl(
                    src,
                    dest);
            }
        }
    },

    installing: function () {
        this.npmInstall();
    }
});