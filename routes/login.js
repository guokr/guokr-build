/* 
 * author: Carl
 * login.js - 用户登录
 * description: 
 * 处理登录相关操作，基础模块，多处判断是否登录时均有用到。
 */
var fs  = require('fs');

/* 功能:渲染登录页
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 通过查看session.user.username是否被设置
 */
exports.logPage = function (req, res){
    res.render('login', { title: '登录', username: 'there', logedIn:false });
};

/* 功能:判断是否登录
 * @param {Request} req
 * @returns {bool} isLogedIn
 * description:
 * 通过查看session.user.username是否被设置
 */
exports.isLogedIn = function(req){
    if( typeof req.session === 'object' && typeof req.session.user === 'object' &&
        req.session.user.username !== null){
        return true;
    }
    return false;
};

/* 功能:登录
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 判断用户名和密码是否匹配
 * 登录成功则设置session.user
 * res返回登录状态代码.
 * 1:成功。2:失败。
 */
exports.logIn = function(req,res){
    
    var username = req.body.username,
        password = req.body.password,
        saveCookieForAMonth = req.body.savecookie === 'on',
        result = {},
        userInfo = JSON.parse(fs.readFileSync( __dirname + '/../usr/user-info.json'));

    if( typeof userInfo != 'object' || userInfo === null ){
        res.send(500);
        console.log('User Info is not a valid object: '+ JSON.stringify(userInfo));
        return;
    }
    
    if( userInfo[username] === password ){
        result.logInStatus = 1;
        req.session.user = {username:username};
        if(saveCookieForAMonth){
            req.session.cookie.maxAge = 2592000000;
        } else {
            req.session.cookie.maxAge = 3600000;
        }
    } else {
        result.logInStatus = 2;
    }
    result.success = true;
    res.header('Content-Type', 'text/plain');
    res.send(result);
};

/* 功能:登出
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 清空session,返回首页。
 */
exports.logOut = function(req,res){
    if( !this.isLogedIn(req) ){
        res.redirect('/');
        return ;
    }
    req.session.destroy();  //destroy session, log out.
    res.redirect('/');
};
