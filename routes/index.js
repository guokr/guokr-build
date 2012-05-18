
/* 
 * author: Carl
 * index.js  - 首页路由设置
 * description: 
 * app.js用到。
 */
var loginMod  = require('./login.js'),
    configMod = require('./config.js'),
    buildMod = require('./build.js');

/* 功能:渲染首页
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 首先进入登录页面(可以cookie直接登录) 。
 * 登录后，判断是否存在配置，存在则进入工作页面，否则进入配置页面.
 */
exports.index = function(req, res){
    var username; 
    if( loginMod.isLogedIn(req) ){  //判断是否登录
        username = req.session.user.username;
        if(configMod.configExist(username)){     //判断配置文件是否存在
            buildMod.buildPage(req,res);
        }
        else{
            configMod.configPage(req,res); //交由配置页面显示
        }
    } else {
       loginMod.logPage(req,res);       //需要登录
    }
};

