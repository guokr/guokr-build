
/* 
 * author: Carl
 * build.js  - 构建工具主体
 * description: 
 * 所有的实际构建操作均在此文件中实现。
 */

var fs = require('fs'),
    path = require('path'),
    cp = require('child_process'),
    utilMod = require('./util.js'), //用于预处理
    uglifyjs = require("uglify-js"),    //uglifyjs，备选压缩工具
    appConfig= require('../config.json'), //构建工具配置
    toolPath = path.join( __dirname, 'tools'),  //压缩用的jar文件所在的工具目录
    javaExist = null,
    __homedir = null;


(function jreExists(){  // run 'java -version' to find out whether java is installed.
    cp.exec('java -version', function( err, stdout, stderr ){
        if(stdout === '')
            stdout = stderr;
        if(stdout.toString().indexOf('Runtime Environment')==-1){
            javaExist = false;
        } else {
            javaExist = true;
        }
    });
})();

(function getHomeDir(){  // run 'echo $HOME' to get home dir.
    cp.exec('echo $HOME', function( err, stdout, stderr ){
        if(stdout.toString().indexOf('/home') === 0 ){
            __homedir = stdout.replace(/\s/g,'');
        }
    });
})();

//拼接数组B到数组A后
function _concat(arrayA, arrayB){
    if(arrayB == null){
        arrayB = arrayA;
        arrayA = this;
    }
    while(arrayB.length>0){
        arrayA.push(arrayB.shift());
    }
    return arrayA;
}

function toObj (arr){
    var o ={};
    for (var i=0, j=arr.length; i<j; ++i) {
        o[arr[i]] = true; 
    }
    return o;
}
function keys(o){
    var rst=[];
    for(i in o){
        if(Object.prototype.hasOwnProperty.call(o,i)){
            rst.push(i);
        }
    }
    return rst;
}
//数组去重
function uniqArray(arr){   
    return keys(toObj(arr));
}

//trim string
function trim(str){
    return str.replace(/(^\s*)|(\s*$)/g, ''); 
}
    
//写文件前先确定目录是否存在，不存在的话就建立
function ensureDirectory( dir ) {
    if ( dir !== '.' && dir.length <= 1 ) {
        return;
    }
    if ( dir[0] != '/') {
        dir = path.resolve('.', dir );
    }
    var dirs = dir.replace(/(^\/|\/$)/, '').split('/'), i, l, _dir;
    for ( i = 1, l = dirs.length; i <= l; i++ ) {
        _dir = '/'+dirs.slice(0, i).join('/');
        if (!path.existsSync( _dir )) {
            fs.mkdirSync( _dir , '775');
        }
    }
}

/* 功能: 格式化date
 * @param {date} date
 * @returns {string} formatedDate
 * description:
 * 返回类似2011/12/2 8:0:12
 */
function formatDate(date){
    return [date.getFullYear(),'/',date.getMonth()+1,'/',date.getDate(),
        ' ',date.getHours(),':',date.getMinutes(),':',date.getSeconds()].join('');
}

/* 功能: 生成目录树
 * @param {string} dirname, {null||int||boolean}treeType, {RegExp}fileRegExp
 * @returns {array} fileTree
 * description:
 * treeType===2时，返回所有的源文件路径的单层array，并非树结构。 
 *      比如 [file1,file2,file3]
 * treeType===1||treeType===true时，返回的目录树为基本类型的树结构，不含有Ext.data.TreeStore要求的信息。
 *      比如 [file1,{name:dir1,children:[file2,file3]}]
 * treeType==null||treeType===false时， 返回Ext.data.TreeStore要求的树结构。
 *      比如 [{text:file1,checked:false,leaf:true,LastModified:2011/12/28 13:5:48},{text:dir1,checked:false,children:[{...file2...},{...file3...}]}]
 * fileRegExp为过滤文件名的正则表达式，默认为匹配所有的js/css文件。
 */
function getFileTree(/*文件目录路径*/dirname,/*目录类型*/treeType, /*文件过滤正则表达式*/fileRegExp){
    var fileTree = [],
        i,
        files = fs.readdirSync(dirname).filter(function (dir){  //filename should not begin with '.'
            return dir[0] !== '.';
        }),
        fileRegExp = typeof fileRegExp !== 'undefined' ? 
            fileRegExp : /\.(?:js|css)$/i ;
   
    treeType = treeType || false;
    for( i=0; i<files.length; i++){
        var filename = path.resolve(dirname , files[i]),
            stat = fs.lstatSync(filename);
        //if( stat.isSymbolicLink() )  // symbolic link
        //    continue;
        if(stat.isDirectory()){
            var children = getFileTree(filename+'/',treeType,fileRegExp);
            if(children.length > 0){   //if directory is not empty
                if(treeType === 2){
                    fileTree = fileTree.concat( children );
                } else if(treeType===1 || treeType===true){
                    fileTree.push({
                        name:filename,
                        children: children
                    });
                } else {
                    fileTree.push({
                        text: files[i],
                        checked: false,
                        children: children
                    });
                }
            }
        }
        if( stat.isFile() && files[i].match(fileRegExp)!==null ){ //.js, .css, .html and picture file
            if(treeType){   //2 or 1 or true
                fileTree.push(filename);
            } else {
                fileTree.push({
                    text: files[i],
                    checked: false,
                    leaf: true,
                    LastModified:formatDate(stat.mtime)
                });
            }
        }
    }
    return fileTree;
}

/* 功能: 依据文件内容获取其依赖的文件
 * @param {string} fileContent
 * @returns {array}deps
 * description:
 * 用正则表达式来寻找@import "file"
 */
function parseFileDeps( filepath, fileContent ){
    var deps = [],
        importReg = /^\s*(?:\/\/)?@import\s+?"([^"]+)".*$/mg,
        matched;
    while(matched = importReg.exec(fileContent)){
        deps.push(path.resolve(path.dirname(filepath),matched[1]));
    }
    return deps;
}

/* 功能: 获取全局所有的依赖关系
 * @param {string} srcDir 源代码文件目录
 * @returns [{{key}filepath:{array}deps,...}, {{key}filepath:{array}revDeps,...},{array}circleDeps]
 * description:
 * 非常重要的基础功能，合并和构建操作都依赖此函数
 * deps为filepath依赖项，revDeps为依赖filepath的项, circleDeps为循环依赖。
 * 整个依赖关系图中一旦出现循环依赖，那就中止任何构建操作，并指出循环依赖所在。
 */
function getAllDeps(srcDir){
    if(!path.existsSync( srcDir )){
        console.log('Error: source code directory does not exist.');
        return null;
    }
    var allFiles = getFileTree(srcDir,2,/\.(?:css|js)$/i),
        deps = {},
        revDeps = {},
        file, fileDeps, i, j;

    for(i=-1;file=allFiles[++i];){
        if( !Object.prototype.hasOwnProperty.call(revDeps,file) ){
            revDeps[file] = [];
        }
        deps[file] = fileDeps = parseFileDeps( file, fs.readFileSync(file, 'utf8') );
        for(j=0;j<fileDeps.length;j++){     // build up revDeps
            if( Object.prototype.hasOwnProperty.call(revDeps,fileDeps[j]) ){
                revDeps[fileDeps[j]].push(file);
            } else {
                revDeps[fileDeps[j]] = [file];
            }
        }
    }
    
    var circleDeps = [],
        circleDepsChain = [];
    
    //寻找循环依赖，找到第一组循环依赖就返回
    function _getCircleDeps(file){
        var i, dep;
        if(circleDeps.length > 0)   //already found a circle deps chain
            return;
        if(circleDepsChain.indexOf(file) > -1){     //found a circle deps chain
            circleDeps = circleDepsChain.slice(0);
            return;
        }
        circleDepsChain.push(file);
        for( i=-1; dep=deps[file][++i]; ){
            if(!Object.prototype.hasOwnProperty.call(deps,dep)){
                console.log('Depended file does not exist: \n\t'+file+' depends on '+dep);
                throw('Depended file does not exist: \n'+file+' depends on '+dep);
            }
            _getCircleDeps(dep);
        }
        circleDepsChain.pop();
    }

    for(file in deps){
        if( !Object.prototype.hasOwnProperty.call(deps,file) ) continue;
        _getCircleDeps(file);
    }

    return [ deps, revDeps, circleDeps ];
}

/* 功能: 获取一个文件的依赖关系
 * @param {string} filepath, {array} allDeps 
 * @returns [{array}deps,{array}revDeps] deps为filepath依赖项，revDeps为依赖filepath的项
 * description:
 * allDeps必须是getAllDeps返回的全局依赖关系
 */
function getFileDeps(filepath, allDeps){
    if(!path.existsSync( filepath )){
        console.log('Error: file does not exist.');
        return null;
    }
    
    var deps = allDeps[0],
        revDeps = allDeps[1],
        searchedFiles = [filepath];

    //递归的获取全局依赖中与当前文件相关的所有依赖关系
    function _getDeps(file,isRev){
        var _depsDict = isRev? revDeps : deps,
            _deps = [], dep, i;
        for( i=-1; dep = _depsDict[file][++i];){
            if( searchedFiles.indexOf(dep) > -1 ){
                _deps.push(dep);
            } else {
                searchedFiles.push(dep);
                if( _depsDict[dep].length>0 ){
                    _deps.push({
                        file: dep,
                        deps:_getDeps(dep,isRev)
                    });
                } else {
                    _deps.push(dep);
                }
            }
        }
        return _deps;
    }

    var fileDeps = _getDeps(filepath,false);
    searchedFiles.length = 0; //clear searchedFiles
    searchedFiles.push(filepath);
    var fileRevDeps = _getDeps(filepath,true);

    return [fileDeps, fileRevDeps];
}

/* 功能: 合并文件
 * @param {array}filepaths, {string}srcDir, {object} allDeps, {boolean} needOutput
 * @returns {array} imported 影响到的所有文件 [, {object}fileCache 合并后的文件内容缓存]
 * description:
 * allDeps 必须是getAllDeps返回的依赖图
 * 需要调用utilMod.autoComplete方法读入预处理过后的文件。
 */
function importFile( filepaths, srcDir, allDeps, needOutput){
    var deps = allDeps[0],
        revDeps = allDeps[1],
        imported = [],      //所有已经被合并的文件
        fileCache = {},     //存放所有已经合并的文件内容
        originalFileContent = {},      //存放文件的原始内容
        i, curFile;

    if(allDeps[2].length>0){  //存在循环依赖
        console.log('Circle dependencies exist. Aborting import operation...');
        throw 'Circle dependencies exist. Operation aborted.';
    }

    function _importAFile(file){  //合并一个文件
        if( imported.indexOf(file) > -1 ){
            return ;
        }

        var importedInAFile= []; //一个文件的依赖关系中已被导入的文件
    
        //深度优先归合并一个文件
        function _importFileRecursively(_file){
            if(importedInAFile.indexOf(_file) > -1)   //避免重复合并
                return '';
            if(!path.existsSync(_file)){
                console.log('Error: Importing file which does not exist: '+_file);
                throw 'Error: Importing file which does not exist: '+_file;
            }
            importedInAFile.push(_file);
            var _fileContent = originalFileContent[_file]==null ?     //将文件原始内容存储至originalFileContent
                originalFileContent[_file] = fs.readFileSync(_file,'utf8') : originalFileContent[_file];
            return originalFileContent[_file].replace(
                         /^\s*(?:\/\/)?@import\s+?(?:"|')([^(?":')]+)(?:"|').*$/mg,     //支持单引号和双引号
                        function(matched,pl){
                            var importingFile = path.resolve(path.dirname(_file),pl);
                            return _importFileRecursively(importingFile);
                   });
        }

        //用replace方法完成文件内容合并，需要递归。否则会出现重复合并
        var fileContent = path.extname(file).toLowerCase() === '.js' ? 
                        utilMod.autoComplete(file,srcDir, _importFileRecursively(file) ): //js files need to be preprocessed
                        _importFileRecursively(file);
        imported.push(file);
        fileCache[file] = fileContent;
        if(needOutput){
            try{
                fs.writeFileSync(file+'.pack',fileContent,'utf8');
            } catch(e){
                throw 'Writing imported file failed.\n'+JSON.stringify(e);
            }
        }
    }

    function _revBfsImportFile(file){ //广度优先导入逆向被依赖的文件
        if(imported.indexOf(file) == -1){
            _importAFile(file);  //现将目前的文件import进来
        }
        for(var i=0; i < revDeps[file].length; i++ ){
            _revBfsImportFile(revDeps[file][i]);
        }
    }

    for(i=-1; curFile=filepaths[++i];){
        _importAFile(curFile);
        _revBfsImportFile(curFile);
    }
    
    delete originalFileContent;

    if(needOutput){
        delete fileCache;
        return imported;
    }
    else
        return [imported,fileCache];
}

/* 功能: 构建文件
 * @param {array}importedFiles, {object}fileCache, {object}config, {function}callback
 * @returns
 * description:
 * importedFiles和fileCache必须是importFile返回的结果。
 * callback函数接受构建结果(fileSucceeded 成功构建的文件,fileFailed 构建失败的文件)，返回发回客户端的信息。
 */
function compressFile(importedFiles, fileCache, config, callback){
    var processQueue = [],  //排队队列, 当前处理数达到最大时，将新的构建请求压入队列中。
        maxProcess = appConfig.maxProcess,  //最大并发数
        curProcess = 0,     //当前并发数
        tmpObj = {};    //for this object
        
    if(!javaExist){     //if jre is not installed.
        console.log('Error: Java Runtime Environment (JRE) is not installed.');
        callback([],importedFiles);
        return;
    }

    function _compressRawCode( binPath, rawCode, callback) {
        //最多同时并发处理 appConfig.maxProcess 多个文件,其余的文件排队等待
        if(curProcess >= maxProcess){
            processQueue.push([binPath,rawCode,callback]);
            return;
        }
        curProcess++;

        //以字符串输入源代码 rawCode，编译后保存到 fileCompressedCache[binPath].
        //之所以不马上存到文件是因为接下来还会对压缩后的代码进一步处理。
        //callback( err, binPath )
        var extname = path.extname( binPath ),
            type =  extname.substr(1),
            useJava = false;

        if(rawCode === ''){
            console.log(binPath+' is empty.');
            callback(fileSucceeded,fileFailed);
        } else if(!Object.prototype.hasOwnProperty.call(config.compress,type)){
            console.log('Fatal error: invalid file type: '+type);
            callback('Fatal error: invalid file type: '+type,binPath);
        } else if(type === 'js' && appConfig.jsCompiler === 'uglify-js'){    //use uglify-js to compress js code
            try{
                console.log( '[uglify-js] Compressing: '+ binPath, 'none');
                var jsp = uglifyjs.parser,  
                    pro = uglifyjs.uglify
                    ast = jsp.parse(rawCode); // 解析代码返回初始的AST
                ast = pro.ast_mangle(ast); // 获取变量名称打乱的AST
                ast = pro.ast_squeeze(ast); // 获取经过压缩优化的AST
                
                fileCompressedCache[binPath] = pro.gen_code(ast); // 压缩后的代码暂存在fileCompressedCache里,待后续处理
            } catch(e) {
                console.log('Error occured while compressing code using uglify-js. ' + e);
                callback('Error occured while compressing code using uglify-js. ' + e, binPath);
                return;
            }
            callback(null, binPath);
        } else {    // use google js compiler.jar to compress js
            useJava = true;
            console.log( (type==='js' ? '[closure]':'[yui]')+' Compressing: '+ binPath, 'none');
            var compressArgs = config.compress[ type ].split(' ');
            var comp = cp.spawn( compressArgs.shift(), compressArgs );
            comp.stdin.end( rawCode, 'utf8' );
            comp.stdout.on('data',function(data){       //将压缩后的代码暂时存在fileCompressedCache里,待后续处理
                fileCompressedCache[binPath] = Object.prototype.hasOwnProperty.call(fileCompressedCache,binPath) ? 
                    fileCompressedCache[binPath].concat(data.toString()) : data.toString();
            });
            
            comp.stderr.on('data', function (data) {
              console.log('Compress process error: \n' + data);
            });

            comp.on('exit', function ( code, signal ) {
                if(!Object.prototype.hasOwnProperty.call(fileCompressedCache,binPath)){
                    console.log('Compressed result is empty.' + binPath);
                    fileCompressedCache[binPath]='';
                    callback( null , binPath);
                } else if(code===null){
                    callback('Compress process exited abnormally. Signal: '+signal, binPath);
                } else {
                    callback( null, binPath );
                }
                curProcess--;
                while(curProcess < maxProcess && processQueue.length>0 ){ //有文件在排队等待处理
                    _compressRawCode.apply(tmpObj,processQueue.shift());           
                }
            });
        }

        if(!useJava){
            curProcess--;
            while(curProcess < maxProcess && processQueue.length>0 ){ //有文件在排队等待处理
                _compressRawCode.apply(tmpObj,processQueue.shift());           
            }
        }
    }
    
    var srcDir = path.resolve(config.base, config.srcPath) + '/',
        binDir = path.resolve(config.base, config.binPath) + '/',
        fileBinPath,
        filesCount = importedFiles.length,
        curCount = 0,                   //compressed files' count
        fileCompressedCache = {},       //files Compressed by yuicompressor-2.4.7.jar|compiler.jar cached here.
        fileSucceeded = [],             //successfully built files
        fileFailed = [],                //failed built files
        i;
 
    //trim cmd before executing it. otherwise the compress would not work.
    config.compress.css = trim(config.compress.css.replace('{toolPath}', toolPath ));
    config.compress.js = trim(config.compress.js.replace('{toolPath}', toolPath ));

    for( i=-1; file=importedFiles[++i]; ){
        fileBinPath = path.resolve(binDir,path.relative(srcDir,file));
        ensureDirectory(path.dirname(fileBinPath));     //确认输出路径里的所有文件夹都存在,不存在则新建文件夹。
        if(!Object.prototype.hasOwnProperty.call(fileCache,file)){
            console.log('Fatal error!! Trying to build file not cached: ' + file);
            continue;
        }
        _compressRawCode(fileBinPath, fileCache[file], function(error, fileCompressed){
            if(error){  
                console.log('Error: can not compress file: '+ fileCompressed +'.\n\t'+error);
                fileFailed.push(fileCompressed);
            } else {    // error为null表示构建动作已正常结束
                var _fileContent = config.versionInfo.replace( '{date}', new Date().toLocaleString() ).replace('{author}', config.author ) +    //增加author信息
                        fileCompressedCache[ fileCompressed ];   //这里将输出文件里的\n全部删掉。如果出现构建后的js不能运行的bug，查一下这里。
                delete fileCompressedCache[ fileCompressed ];   //清除文件缓存内容，回收内存
                if ( /\/(g|h|area|area_2)\.js$/.test( fileCompressed ) ) {     //对g|h|area这几个js文件的unicode字符进行特殊处理
                    _fileContent = _fileContent.replace( '\\u000b1', '\\v1' )       // fix old clousure compiler bug
                                               .replace( '\v1', '\\v1' );
                    console.log( fileCompressed + ': Replace \\u000b1 to \\v1 !', 'none');
                }
                fs.writeFileSync( fileCompressed, _fileContent, 'utf8' ); //输出格式从ascii改为utf8,可能直接用浏览器查看源码时会显示中文乱码。
                delete _fileContent;
                console.log('Compress completed: '+fileCompressed, 'none');
                fileSucceeded.push(fileCompressed);
            }
            if(++curCount === filesCount){  //all imported files are compressed
                callback(fileSucceeded,fileFailed);
            }
        });
    }
    if(importedFiles.length === 0){
        callback([],[]);
    }
    delete importedFiles;
    delete fileCache;
}

/* 功能: 复制文件从src目录到bin目录
 * @param {array}files, {object}config, {function}callback
 * @returns
 * description:
 * callback函数接受构建结果(fileSucceeded 成功构建的文件,fileFailed 构建失败的文件)，返回发回客户端的信息。
 */
function copyFile(files, config, callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/',
        binDir = path.resolve(config.base, config.binPath) + '/',
        fileSucceeded = [],
        fileFailed = [],
        fileCount = 0,
        i;
    function _copy(file){
        var args=['cp'],
            targetDir = path.dirname(path.resolve(binDir,file))+'/';
        ensureDirectory(targetDir);
        args.push(path.resolve(srcDir,file));   //srcpath
        args.push(targetDir); //binpath
        console.log('Copying '+args[1]+' to '+ args[2],'none');
        cp.exec(args.join(' '), function( err, stdout, stderr ){
            var binPath = path.resolve(config.base,config.binPath,file);
            if ( err && err.code != 1) {
                console.log( 'Copy error: ' +  err );
                fileFailed.push(binPath);
                if(++fileCount === files.length){
                    callback(fileSucceeded,fileFailed);
                }
                return;
            }
            if ( stderr ) {
                console.log( 'Copy error: ' + stderr );
                fileFailed.push(binPath);
                if(++fileCount === files.length){
                    callback(fileSucceeded,fileFailed);
                }
                return;
            }
            console.log('Copy completed. From '+args[1]+' to '+ args[2],'none');
            fileSucceeded.push(binPath);
            if(++fileCount === files.length){
                callback(fileSucceeded,fileFailed);
            }
        });
    }

    for (i=0; i<files.length; i++){
        _copy(files[i]);
    }
    if(files.length === 0){
        callback([],[]);
    }
}

/* 功能: 过滤文件
 * @param {string}query, {array}filepaths, {object}config
 * @returns {array}result
 * description:
 * 返回filepaths中符合query要求的文件。
 * 利用hg的python api编写了filter.py。 python lib/filter.py --help 获得更详细的介绍。
 * 这里使用filter.py输出的json数据来过滤。
 * hg:status 只有../routes/build.js 里 getHgStatus 才会发此query。
 */
function filterFile(query,filepaths,config,callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/';
    
    if(!path.existsSync(srcDir)){
        console.log('Source directory does not exists. Aborting filter operation...');
        callback(false);
        return ;
    }

    var filterPy = path.resolve(__dirname,'lib/filter.py'),     //the python script to fetch hg info
        queryHead = 'hg:',  //query should begin with hg: 
        logHead = 'log=',   //filter by log begin with hg:log=
        isLog=false,        //should filter by log
        statusHead = 'status',  // status begin with status. This is called only in ../routes/build.js -> exports.getHgStatus
        isStatus = false,   //should get hg status
        filterFlag = ',',   //two changset id is seperated by filterFlag which should be ','
        isFilter = false,   //should filter by changset range
        args = ['python2.7', filterPy, config.base];     //arguments of cp

    //if filepath is in srcDir, return the relative path. else return false.
    function isInSrcDir(_filepath){
        var filepathRelativeToSrcDir = path.relative( srcDir, path.resolve(config.base,_filepath) );
        if( filepathRelativeToSrcDir.substr(0,2) !== '..' ) { // file is in srcDir
            return filepathRelativeToSrcDir;
        }
        return false;
    }

    query = query.replace(/\s/g,'');    //remove all spaces in query

    if(query.indexOf(queryHead)!==0){ //not started with hg, invalid query 
        console.log('[Error in filter]: query not started with hg. query:'+query);
        callback(false);
        return;
    } else {
        query = query.substr(3);
    }

    if( query.indexOf(logHead) === 0 ){ //filter by log
        isLog = true;
        args.push('-l');
        args.push(query.substr(logHead.length));
    } else if( query.indexOf(filterFlag) > 0 ){ // filter by changeset range
        var pos = query.split(filterFlag);
        if(pos.length !== 2){  // invalid arguments length
            console.log('[Error in filter]: invalid arguments length of query. query:'+query);
            callback(false);
            return;
        }
        isFilter = true;
        args.push('-f');
        args.push(pos[0]);
        args.push(pos[1]);
    } else if( query === statusHead ){  //get status info
        isStatus = true;
        args.push('-s');
    } else {    //invalid query
        console.log('[Error in filter]: invalid arguments length of query. query:'+query);
        callback(false);
        return;
    }

    cp.exec(args.join(' '), function( err, stdout, stderr ){
        if ( err && err.code != 1) {
            console.log( 'Filter error: ' +  err );
            callback(false);
            return;
        }
        if ( stderr ) {
            console.log( 'Filter error: ' + stderr );
            callback(false);
            return;
        }
        var data = JSON.parse(stdout),
            filepathRelativeToSrcDir,
            result,
            _filepath,
            i;
        if( typeof data === 'string' && data.indexOf('Error') > -1 ){
            console.log('Error occured while running filter.py. '+ data);
            callback(false);
            return;
        }
        if( isLog || isFilter ){    //log and filter returned array
            result = [];
            for(i=0;i<data.length;i++){
                if(_filepath = isInSrcDir(data[i])) // filter by isInSrcDir
                    if( filepaths.indexOf(_filepath)>-1)     // filter by filepaths
                        result.push(_filepath);
            }
        } else if( isStatus ){      //status returned object
            result = {};
            for(i=0;i<data.A.length;i++){
                if(_filepath = isInSrcDir(data.A[i]))   // new files
                    result[_filepath] = 'A';
            }
            for(i=0;i<data.M.length;i++){
                if(_filepath = isInSrcDir(data.M[i]))   // modified files
                    result[_filepath] = 'M';
            }
        }
        callback(result);
    });
}

/* 功能: 更新文件版本号
 * @param {array}selectedFiles, {string}updatePath, {string}versionString, {object}config, {function}callback
 * @returns
 * description:
 * 更新htmlDirs里的所有js和css文件的引用版本号
 * 更新cssDirs里的所有图片的引用版本号
 * 通过一组正则表达式来寻找是否存在引用
 */
function updateVersionInFiles(selectedFiles,updatePath,versionString,config,callback){
    var baseDir = path.resolve(config.base),    //base dir
        binDir = path.resolve(config.base, config.binPath) + '/',
        jsFlag = config.js,
        skinFlag = config.skin,
        htmlDirs = uniqArray((updatePath+';'+config.updatePaths.replace(/{base}/gm,baseDir))    //all the dirs which has html
            .split(';').filter(function(dir){
                    return !(dir==='');
                })),
        cssDir = path.resolve(config.base, config.binPath, config.skin),    //css dir
        htmlFiles = [], //html files in htmlDirs
        cssFiles = [],  //css files in cssDir
        scriptFiles, //css or js files in selectedFiles
        pictureFiles, //png,jpg,jpeg,gif,ico file in selectedFiles
        fileSucceeded = [],    //file successfully updated
        fileFailed = [],
        i,j;

    for(i=0;i<htmlDirs.length;i++){
        if( htmlDirs[i].indexOf('~')===0 && __homedir !== null){       //为了支持 '~'
            htmlDirs[i] = htmlDirs[i].replace('~',__homedir);
        }
        if(path.existsSync(path.resolve(htmlDirs[i]))){ //get all files in the dirs
            _concat(htmlFiles, getFileTree(path.resolve(htmlDirs[i]),2,/\.html$/i));
        } else {    // dir does not exist
            console.log('Directory '+htmlDirs[i]+' does not exist.');
            fileFailed.push(htmlDirs[i]+'//');
        }
    }
    cssFiles = getFileTree(cssDir,2,/\.css$/i);
    scriptFiles = selectedFiles.filter(function(file){
                return /\.(?:js|css)$/i.test(file);
            });
    pictureFiles = selectedFiles.filter(function(file){
                return /\.(?:png|jpg|jpeg|gif|ico)$/i.test(file);
            });


    function _updateVersion(srcFiles, tgtFiles){
        var re, //regexp
            contents = {},
            fileChanged = {};
        for(i=0; i<tgtFiles.length; i++){
            contents[tgtFiles[i]] = fs.readFileSync(tgtFiles[i],'utf8');
        }
        for(j=0; j<srcFiles.length; j++){
            // regexp for matching srcfile link
            re = RegExp('[^\\s"\'\(\)]*'+srcFiles[j].replace(/\//mg,'\\/')+'(?:\\?(?:[^\\s"\'\(\)]*=)?[^\\s"\'\(\)]*)?','mg');
            for(i=0; i<tgtFiles.length; i++){
                contents[tgtFiles[i]] = contents[tgtFiles[i]].replace(re,function(matched, pl){
                    fileChanged[tgtFiles[i]] = true;
                    var versionRe = /(?:\?([^\s"']*=)?[^\s"']*)+$/gm;   //以?[key=]value结尾
                    if(versionRe.test(matched)){
                        return matched.replace(versionRe,'?'+versionString);
                    }
                    return matched+'?'+versionString;
                });
            }
        }
        for(i=0; i<tgtFiles.length; i++){
            if(fileChanged[tgtFiles[i]]){
                console.log('Updated version in '+tgtFiles[i],'none');
                fs.writeFileSync(tgtFiles[i], contents[tgtFiles[i]], 'utf8');
            }
            delete contents[tgtFiles[i]];
        }
        return keys(fileChanged);
    }

    //----------- handle js/css in html --------------
    _concat(fileSucceeded,_updateVersion(scriptFiles, htmlFiles));
    //----------- handle pictures in css -------------
    _concat(fileSucceeded,_updateVersion(pictureFiles, cssFiles));

    callback(fileSucceeded,fileFailed);
}

/* 功能: 获取源文件目录树(只考虑js和css)
 * @param {string} srcDir
 * @returns {string}  fileTreeJson
 * description:
 * 根据配置文件读取源文件目录下的所有js和css文件。
 */
exports.getFileTreeJson = function(srcDir){
    var stat;
    if(path.existsSync(srcDir) && (stat = fs.lstatSync(srcDir)).isDirectory()
            && !stat.isSymbolicLink()){ // do not handle symbolic link
        return JSON.stringify(getFileTree(srcDir,false,/\.(?:css|js|jpg|jpeg|png|gif|ico)$/i));
    } else { //Src directory is not a valid directory.
        console.log(srcDir + ' is not a valid directory.');
        return false;
    }
}

/* 功能: 获取hg status信息
 * @param {object} config
 * @returns
 * description:
 * callback({object}hgStatusData)
 * use cp.exec to run "hg status" and get the stdout info
 */
/* this function is deprecated
//no longer use cmd to get hg information, use filter.py instead
exports.getHgStatus= function(config, callback){
    filterFile('hg:status',[],config,function(result){  //use filter instead
        callback(result);
    });
    var srcDir = path.resolve(config.base, config.srcPath) + '/';
    cp.exec('cd '+config.base+';hg status', function( err, stdout, stderr ){
        if ( err && err.code != 1) {
            console.log( err );
            callback(false);
            return;
        }
        if ( stderr ) {
            console.log( stderr );
            callback(false);
            return;
        }
        var statusRows = stdout.split('\n'),
            hgStatusData = {},
            row, rowRelativeToSrcDir, i;    //typical status row: 'A src/js/a.js', A for add, followed by file path to base dir
        for( i=-1; row = statusRows[++i]; ){
            if( row === '' ) continue;
            row = row.split(' ');
            rowRelativeToSrcDir = path.relative( srcDir, path.resolve(config.base,row[1]) );
            if( rowRelativeToSrcDir.substr(0,2) !== '..' ) { // file is in srcDir
                hgStatusData[rowRelativeToSrcDir] = row[0];
            }
        }
        callback(hgStatusData);
    });
}
*/

//===================================================================
//以下函数对应于action字典。
//在routes/build.js中依据网页端发回的action调用。
//所有的callback最终只接受需要发回客户端的消息。
exports.build = function(filepaths,config,callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/',
        binDir = path.resolve(config.base, config.binPath) + '/';

    if(!path.existsSync(srcDir)){
        console.log('Source directory does not exists. Aborting build operation...');
        callback('错误:源代码目录不存在.');
        return ;
    }

    var allDeps,
        filepaths = (Object.prototype.toString.call(filepaths) === '[object Array]') ? filepaths : [filepaths],
        pictureFilepaths = filepaths.filter(function(a){    //filter all picture files
                return /\.(?:jpg|jpeg|gif|png|ico)/.test(a);
                }),
        fileSucceeded = [],
        fileFailed = [],
        fileCount = filepaths.length,
        _generateResponseCalledTimes = 0,
        i;

    filepaths = filepaths.filter(function(a){   // filter all js and css files
                return /\.(?:js|css)/.test(a);
                });

    if(pictureFilepaths.length + filepaths.length !== fileCount){
        console.log('Unknown file type found. Aborting build operation...');
        callback('错误:存在未知类型的文件.');
        return ;
    }

    try{
        allDeps = getAllDeps(srcDir);
    } catch(e){
        callback('Error while getDependency: '+e);
        return ;
    }


    if(allDeps[2].length>0){  //存在循环依赖
        console.log('Circle dependencies exist. Aborting build operation...');
        callback('源代码中存在循环依赖，无法构建。<br/>循环依赖的文件：'+allDeps[2].join(','));
        return ;
    }

    for(i=0; i<filepaths.length; i++ ){
        filepaths[i] = path.resolve(srcDir, filepaths[i]);
    }

    function _getBinRelativePath( fileArray ){  //将绝对路径转换为相对于binDir的路径
        for(var i=0; i<fileArray.length; i++ ){
            fileArray[i] = path.relative(binDir,fileArray[i]);
        }
        return fileArray;
    }

    var importedResult;
    try{
        //try importFile by all dependencies
        importedResult = importFile(filepaths,srcDir,allDeps,false);
    } catch (e){
        var result = ('合并文件时发生错误: '+e);
        console.log(result);
        callback(result);
        return;
    }

    function _generateResponse(_fileSucceeded,_fileFailed){
        _concat(fileSucceeded,_fileSucceeded);
        _concat(fileFailed,_fileFailed);
        if(++_generateResponseCalledTimes !== 2)    //wait all buidling file operation to complete
            return;
        //take fileSucceeded and fileFailed to generate response
        var result=[];
        result._concat = _concat;
        if(fileFailed.length>0){     //some files failed compressing
            if( fileSucceeded.length>0 ){
                result.push('以下'+fileFailed.length+'个文件构建失败，请查看服务器日志以获得更多信息：');
                result._concat(_getBinRelativePath(fileFailed));
                result.push('成功构建了'+fileSucceeded.length+'个文件：');
                result._concat( _getBinRelativePath(fileSucceeded) );
            } else {
                result.push('全部'+fileFailed.length+'个文件都构建失败，请查看服务器日志以获得更多信息：');
                result._concat(_getBinRelativePath(fileFailed));
            }
        }else{  //all files compressed successfully
            result.push('全部'+fileSucceeded.length+'个文件构建成功：');
            result._concat( _getBinRelativePath(fileSucceeded) );
        }
        callback(result.join('<br/>'));
    }

    //compress all files that imported in importFile
    compressFile(importedResult[0],importedResult[1],config,_generateResponse);
    //copy all picture files from srcDir to binDir
    copyFile(pictureFilepaths,config,_generateResponse);
};

exports.import = function(filepaths,config,callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/';

    if(!path.existsSync(srcDir)){
        console.log('Source directory does not exists. Aborting import operation...');
        callback('错误:源代码目录不存在.');
        return ;
    }
    
    var allDeps,
        filepaths = (Object.prototype.toString.call(filepaths) === '[object Array]') ? filepaths : [filepaths],
        imported,
        result = [];

    filepaths = filepaths.filter(function(a){   // filter all js and css files
                return /\.(?:js|css)/.test(a);
                });
    try{
        allDeps = getAllDeps(srcDir);
    } catch(e){
        callback('Error while getDependency: '+e);
        return ;
    }

    for(var i=0; i<filepaths.length; i++ ){
        filepaths[i] = path.resolve(srcDir, filepaths[i]);
    }

    try{
        result._concat = _concat;
        //output imported file to the same directory (save as *.pack).
        imported = importFile(filepaths,srcDir,allDeps,true);
        for( i=0; i<imported.length; i++){
            imported[i] = path.relative(srcDir,imported[i]);
        }
        result.push('合并已完成。 被合并的文件有:');
        result._concat(imported);
    } catch(e){
        result.push('合并文件时发生错误: '+e);
        console.log(result[0]);
    }

    callback(result.join('<br/>'));
};

exports.proxy= function(filepaths,config,callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/';

    if(!path.existsSync(srcDir)){
        console.log('Source directory does not exists. Aborting import operation...');
        callback('错误:源代码目录不存在.');
        return ;
    }

    callback('代理功能还没有实现哟.\n<br/>' + JSON.stringify(filepaths));
};

exports.cancelAllProxy = function(filepaths,config,callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/';

    if(!path.existsSync(srcDir)){
        console.log('Source directory does not exists. Aborting import operation...');
        callback('错误:源代码目录不存在.');
        return ;
    }

    callback('取消全部代理功能还没有实现哟.\n<br/>');
};

exports.getDependency = function(file,config,callback){
    var srcDir = path.resolve(config.base, config.srcPath) + '/';
    
    if(!path.existsSync(srcDir)){
        console.log('Source directory does not exists. Aborting getDependency opration...');
        callback('错误:源代码目录不存在.');
        return ;
    }

    if(!(/\.(?:js|css)/.test(file))){
        console.log('Trying to getDependency with wrong type file. Aborting getDependency operation...');
        callback('错误:该文件不是js或css类型.');
        return ;
    }

    var allDeps,
        fileAllDeps,
        existCircleDeps = false,
        result;

    try{
        allDeps = getAllDeps(srcDir);
    } catch(e){
        callback('Error while getDependency: '+e);
        return ;
    }

    //将依赖图中的绝对路径转换为其和file的相对路径
    function _getRelativePath(deps){
        var _deps = [], dep, i;
        for(i=-1; dep=deps[++i];){
            if(typeof dep === 'string'){
                _deps.push(path.relative(path.dirname(file),dep));
            } else if( typeof dep === 'object' &&
                    Object.prototype.toString.call(dep.deps) === '[object Array]'){
                _deps.push({
                    file:path.relative(path.dirname(file),dep.file),
                    deps:_getRelativePath(dep.deps)
                });
            } else {
                console.log('Dependency array is invalid.');
            }
        }
        return _deps;
    }

    //生成返回信息
    if(typeof file !== 'string' && allDeps !== null){
        result = '文件路径不是字符串或者无法获取所有文件之间的依赖关系';
    } else {
        file = path.resolve(srcDir,file);
        fileAllDeps = getFileDeps(file,allDeps);
        
        result = [path.basename(file),'依赖: <br/>', JSON.stringify(_getRelativePath(fileAllDeps[0])), 
               '<br/>依赖', path.basename(file), '的文件: <br/>', JSON.stringify(_getRelativePath(fileAllDeps[1]))];
        if( allDeps[2].length > 0 ){
            result.push('<br/>严重警告: 存在循环依赖(将无法执行构建和合并操作):<br/>'+JSON.stringify(_getRelativePath(allDeps[2])));
        }
    }
    callback(result.join(''));
};

exports.filter = function(query,filepaths,config,callback){
    var filepaths = (Object.prototype.toString.call(filepaths) === '[object Array]') ? filepaths : [filepaths];
    filterFile(query,filepaths,config,function(result){
        callback(result);
    });
};

exports.updateVersion = function(filepaths ,updatePath,versionString,config,callback){
    var filepaths = (Object.prototype.toString.call(filepaths) === '[object Array]') ? filepaths : [filepaths];

    updateVersionInFiles(filepaths,updatePath,versionString,config,function(fileSucceeded,fileFailed){
        //take fileSucceeded and fileFailed to generate response
        var result=[],
            i;
        for(i=0; i<fileSucceeded.length; i++){
            fileSucceeded[i] = path.dirname(fileSucceeded[i]);
        }
        for(i=0; i<fileFailed.length; i++){
            fileFailed[i] = path.dirname(fileFailed[i]);
        }
        fileSucceeded = uniqArray(fileSucceeded);
        fileFailed = uniqArray(fileFailed);
        result._concat = _concat;
        if(fileFailed.length>0){     //some files failed compressing
            if( fileSucceeded.length>0 ){
                result.push('以下'+fileFailed.length+'个目录更新失败，更多信息请查服务器日志：');
                result._concat(fileFailed);
                result.push('成功更新了'+fileSucceeded.length+'个目录：');
                result._concat( fileSucceeded );
            } else {
                result.push('全部'+fileFailed.length+'个目录都更新失败，更多信息请查服务器日志：');
                result._concat(fileFailed);
            }
        }else{  //all files compressed successfully
            result.push('全部'+fileSucceeded.length+'个目录更新成功：');
            result._concat( fileSucceeded );
        }
        callback(result.join('<br/>'));
    });
};
//===================================================================
