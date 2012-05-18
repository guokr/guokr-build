
/* 
 * author: Carl
 * build.js  - 处理工作页面相关请求
 * description: 
 * 调用../build/build.js来进行构建。
 */
var fs        = require('fs'),
    path      = require('path'),
    loginMod  = require('./login.js'),
    configMod = require('./config.js'),
    buildMod  = require(__dirname+'/../build/build.js');


/* 功能:渲染工作页面
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 */
exports.buildPage = function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }
    var username = req.session.user.username;
    res.render('build', {
        title: '工作页面',
        username: username,
        pageLink:'config',
        pageName:'配置页面',
        logedIn: true
    });
};

/* 功能: 获取源文件目录树(只考虑js和css)
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 调用buildMod的getFileTreeJson获取目录树json
 */
exports.getFileTreeJson= function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }
    var config = JSON.parse(configMod.readConfig(req.session.user.username)),
        srcDir = path.resolve(config.base, config.srcPath) + '/',
        fileTreeJson = buildMod.getFileTreeJson(srcDir);
    res.header('Content-Type', 'text/plain');
    if(typeof fileTreeJson === 'boolean' && fileTreeJson === false){
        res.send(500);
    } else {
        res.send(fileTreeJson);
    }
};

/* 功能: 获取hg status信息
 * @param {Request} req, {Response} res
 * @returns
 * description:
 * {object} status 
 * callback函数将status序列化后发回客户端
 */
exports.getHgStatus= function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }

    var username = req.session.user.username,
        config = JSON.parse(configMod.readConfig(username));
  
    //call filter function. query='hg:status', filepaths=[]
    buildMod.filter('hg:status',[],config,function( result ){
        res.header('Content-Type', 'text/plain');
        if(result === false){
            res.send(500);    
        } else {
            res.send(JSON.stringify(result));
        }
    }); 
};

/* 功能: 根据过滤语句进行过滤
 * @param {Request} req, {Response} res
 * @returns
 * description:
 * {array} filterResult 过滤结果
 * callback函数将filterResult序列化后发回客户端
 */
exports.filter= function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }

    var username = req.session.user.username,
        query = req.body.query,
        filePath = req.body.filePath,
        config = JSON.parse(configMod.readConfig(username));
            
    buildMod.filter(query,filePath,config,function( result ){
        res.header('Content-Type', 'text/plain');
        if(result === false){
            res.send(500);    
        } else {
            res.send(JSON.stringify(result));
        }
    });
};

/* 功能: 更新版本号
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 更新依赖被选中文件的文件的引用版本号
 * 如a.js被i.html依赖，a.js变动以后，i.html中引用a.js?{newVersionNumber}。
 */
exports.updateVersion = function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }

    var username = req.session.user.username,
        filePaths = req.body.filePaths,
        updatePath = req.body.updatePath,
        versionString = req.body.versionString,
        config = JSON.parse(configMod.readConfig(username));

    buildMod.updateVersion(filePaths,updatePath,versionString,config,function( responseText ){
        //this callback function just send the result from action as response to client
        res.header('Content-Type', 'text/plain');
        res.send(responseText);
    });
};

/* 功能: 构建命令，本工具的核心功能
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 依据action获取buildMod中相应的处理函数进行处理，需要传入filePath,config和callback函数。
 * {string} responseText 依据不同的action得到的不同构建结果
 * callback函数只接受需要直接发回客户端的文本信息responseText。
 */
exports.buildFile= function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }

    var username = req.session.user.username,
        action = req.body.action,
        filePath = req.body.filePath,
        config = JSON.parse(configMod.readConfig(username));

    buildMod[action](filePath,config,function( responseText ){
        //this callback function just send the result from action as response to client
        res.header('Content-Type', 'text/plain');
        res.send(responseText);
    });
};
