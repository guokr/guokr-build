/* 
 * author: Carl
 * config.js  - 依据用户名来读取配置
 * description: 
 * 查找 用户名.config.json 文件是否存在。
 * 保存配置到 用户名.config.json 。
 * app.js routes/index.js|build.js用到。
 */

var fs       = require('fs'),
    path     = require('path'),         //path用于探测文件是否存在
    colors     = require('colors'),     // 命令行输出彩色信息
    loginMod = require('./login.js'),
    configCache = {};   //缓存已经加载的config

/* 功能:判断用户的配置文件是否存在
 * @param username
 * @returns {bool} configExist
 * description:
 * 通过path.existsSync来判断配置文件是否存在
 */
exports.configExist = function(username){
    var file  = __dirname + '/../configs/'+username+'.config.json';
    return path.existsSync(file);
};

/* 功能:根据用户名读取相应的配置文件
 * @param username
 * @returns {string} configContent
 * description:
 * 尝试从缓存中查找配置
 * 如果config不存在，就读取默认配置。
 */
exports.readConfig = function(username){
    if(Object.prototype.hasOwnProperty.call(configCache,username)){
        return configCache[username];
    }
    var file = __dirname + '/../configs/',
        configContent;
    if(this.configExist(username)){
        file += username+'.config.json';
        //存至缓存
        configCache[username] = configContent = fs.readFileSync( file );
    } else {
        file += 'default.config.json'; //config不存在，读取默认配置
        configContent = fs.readFileSync( file );
    }
    return configContent;
};

/* 功能:保存配置信息
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 处理post请求，将req.body中的post数据存入用户名对应的配置文件中
 * res返回登录状态代码.
 * 1:成功。2:失败。 errorcode暂时设置为2.
 */
exports.saveConfig = function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }

    var username  = req.session.user.username,
        file  = __dirname + '/../configs/'+username+'.config.json',
        config    = req.body,
        configObj = {compress:{}},     //根据post数据构建配置的js对象
        result    = {},
        configStr;

    for( var i in config ){ //根据客户端的post数据生成新的config
        if( !Object.prototype.hasOwnProperty.call(config,i) ) continue;
        if( i === 'csscmd' ){
            configObj.compress.css = config[i];
            continue;
        }
        if( i === 'jscmd' ){
            configObj.compress.js = config[i];
            continue;
        }
        configObj[i] = config[i];
    }

    try{    //更新缓存以及写回文件
        configCache[username] = configStr = JSON.stringify(configObj);
        fs.writeFileSync(file,configStr,'utf8');
        result.saveStatus = 1;
    }catch(e){
        console.log("Save config file failed:"+file);
        console.log(e);
        result.saveStatus = 2;
        result.errorcode = 2;
    }

    result.success = true;
    res.header('Content-Type', 'text/plain');
    res.send(result);

};

/* 功能: 渲染配置页
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 */
exports.configPage = function(req,res){
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }
    var username  = req.session.user.username;
    res.render('config', {
            title: '配置页面',
            username: username, 
            config: this.readConfig(username),
            pageLink:'build',
            pageName:'工作页面',
            logedIn: true
    });
}

