/* 
 * author: Carl
 * profile.js  - 帐号管理：修改密码和添加用户
 * description: 
 * 实现账户管理功能，app.js用到。
 */


var fs       = require('fs'),
    userInfo = JSON.parse(fs.readFileSync( __dirname + '/../usr/user-info.json')),
    loginMod = require('./login.js');

/* 功能:渲染帐户管理页
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 通过查看session.user.username是否被设置
 */
exports.profilePage = function(req,res){
    //如果未登录，跳转到首页。
    if(!loginMod.isLogedIn(req)){
        res.redirect('/');
        return ;
    }
    if( typeof userInfo != 'object' || userInfo === null ){
        res.send(500);
        console.log('User Info is not a valid object: '+ JSON.stringify(userInfo));
        return;
    }

    var username = req.session.user.username;
    res.render('profile', {
            title: '帐号管理',
            username: username,
            pageLink:'build',
            pageName:'工作页面',
            logedIn: true
    });
};

/* 功能:修改密码
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 首先判断旧密码是否正确。
 * 然后将新的用户信息表写回文件。
 * res返回登录状态代码.
 * 1:成功。2:失败。
 */
exports.changePassword = function(req,res){
    var username = req.session.user.username,
        oldpassword = req.body.oldpassword,
        newpassword = req.body.newpassword,
        result = {};

    if( typeof userInfo != 'object' || userInfo === null ){
        res.send(500);
        console.log('User Info is not a valid object: '+ JSON.stringify(userInfo));
        return;
    }
    try{
        if( userInfo[username] === null ){
            result.changePasswordStatus = 0;
        } else if( userInfo[username] !== oldpassword ){
            result.changePasswordStatus = 2;
        } else {
            userInfo[username] = newpassword;
            this.saveUserInfo();
            result.changePasswordStatus = 1;
        }
    } catch(e){
        console.log('Save userInfo file failed. '+e);
        result.changePasswordStatus = 0;
    }
    result.success = true;
    res.header('Content-Type', 'text/plain');
    res.send(result);
}

/* 功能:添加用户
 * @param {Request} req, {Response} res
 * @returns 
 * description:
 * 首先判断用户名是否已经存在。
 * 然后将添加后的用户信息表写回文件。
 * res返回登录状态代码.
 * 1:成功。2:失败。
 */
exports.newUser = function(req,res){
    var newusername = req.body.username,
        newuserpassword = req.body.newuserpassword,
        result = {};

    if( typeof userInfo != 'object' || userInfo === null ){
        res.send(500);
        console.log(JSON.stringify(userInfo));
        return;
    }
    try{
        if( Object.prototype.hasOwnProperty.call(userInfo,newusername) ){  //用户已存在
            result.newUserStatus = 2;
        } else {
            userInfo[newusername] = newuserpassword;
            this.saveUserInfo();
            result.newUserStatus = 1;
        }
    }catch(e){
        console.log("Save userInfo file failed.");
        console.log(e);
        result.newUserStatus = 0;
    }
    result.success = true;
    res.header('Content-Type', 'text/plain');
    res.send(result);
};

/* 功能:将用户信息表保存至文件
 * @param 
 * throw exception from file system
 * @returns 
 * description:
 * 将用户信息表写回文件。
 */
exports.saveUserInfo = function(){
    var file =  __dirname + '/../usr/user-info.json';
    try{
        fs.writeFileSync(file,JSON.stringify(userInfo));
    }catch(e){
        throw e;
    }
};

