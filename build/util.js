var uglify = require('uglify-js'),
    jsp = uglify.parser,
    pro = uglify.uglify,
    path = require('path'),
    fs = require('fs'),
    Ast = require('./lib/ast'),
    dependences = require('./lib/dependences');


function getId( filePath, rootPath ) {
    if ( ~filePath.indexOf(rootPath) ) {
        return '/'+filePath.replace( rootPath, '' );
    } else {
        throw 'File:'+filePath+' is not in rootPath:\n'+rootPath;
    }
}

function autoComplete( path, rootPath, code ) {
    var ast = jsp.parse(code),
        id = getId(path, rootPath),
        deps = dependences.parse( path ),
        times = 0;
    ast = Ast.walk(ast, 'stat', function(stat) {
        if (stat.toString().indexOf('stat,call,name,define,') !== 0) {
            return stat;
        }

        if (++times > 1) {
            // Found multiple "define" in one module file. Only handle the first one.
            return;
        }

        if (id) {
            id = ['string', id];
        }

        if (deps && deps.length) {
            deps = ['array', deps.map(function(item) {
                return ['string', item];
            })];
        }

        // stat[1]:
        //     [ 'call',
        //       [ 'name', 'define' ],
        //       [ [ 'function', null, [Object], [Object] ] ] ]
        var args = stat[1][2];

        // define(factory)
        if (args.length === 1 && deps) {
            args.unshift(deps);
        }
        if (args.length === 2) {
            var type = args[0][0];
            // define(id, factory)
            if (type === 'string' && deps && deps.length) {
                var factory = args.pop();
                args.push(deps, factory);
            }
            // define(deps, factory)
            else if (type === 'array' && id) {
                args.unshift(id);
            }
        }

        return stat;
    });

    // ast = pro.ast_mangle(ast, options); // 错乱变量命名生成ast
    // ast = pro.ast_squeeze(ast, options);// 压缩代码生成ast
    return pro.gen_code(ast).replace('\v','\\v')+ ';'; // fix uglifyjs 的bug
}
// Test:
/*var testPath = path.join( __dirname, '../src/js/lib/rangy.js' ),
    config = JSON.parse(fs.readFileSync(__dirname + '/config/project.json')),
    rootPath = path.join( __dirname, config.srcPath ),
    code = fs.readFileSync( testPath, 'utf8' );
console.log(autoComplete( testPath, rootPath, code ));*/

exports.autoComplete = autoComplete;
