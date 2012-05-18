
/**
 * app.js - node执行此脚本开始运行服务器
 * author: Carl.
 */

var express    = require('express'),
    fs         = require('fs'),                 // 文件操作
    colors     = require('colors'),             // 命令行输出彩色信息
    appConfig  = require('./config.json'), //构建工具配置
    modMap     = {      //to cache Module
        index   : {path : './routes/index.js'   } ,
        login   : {path : './routes/login.js'   } ,
        profile : {path : './routes/profile.js' } ,
        build   : {path : './routes/build.js'   } ,
        config  : {path : './routes/config.js'  }
    };

//change global console.log to colored log
//default color is red
console._log = console.log;
console.log  = function(str,color){
    color = color || 'red';
    if(color === 'none'){   //none means use default color
        console._log(str);
    } else {
        console._log(str[color]);
    }
}

for(var i in modMap){
    if( !Object.prototype.hasOwnProperty.call(modMap,i) ) continue;
    modMap[i].mod = require(modMap[i].path);
}

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');

  app.set('view engine', 'jade');
  app.use(express.bodyParser());

  //session support
  app.use(express.cookieParser());
  var sessionConfig = {
    secret : 'guokr is GREAT.',
    cookie : {maxAge : 2592000000} // save cookie for a month
  };
  if(appConfig.sessionStore.toLowerCase() === 'redis'){
    //use Redis as data store.
    var RedisStore = require('connect-redis')(express);
    sessionConfig.store = new RedisStore;
    console.log('Using Redis as session data store.','yellow');
  }
  app.use(express.session(sessionConfig));
  app.use(express.methodOverride());
});

app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public',{maxAge: oneYear}));
  app.use(app.router);
  app.use(express.errorHandler()); 
});

//根据path和handler加载一个router
function startRouter(path,handler){
    // pass request to handler in routes.json.
    function requestHandler (req,res){
        var mod;
        //use cached module if exist
        if( modMap.hasOwnProperty(handler.mod) && typeof modMap[handler.mod] === 'object' ){
            mod = modMap[handler.mod].mod;
        } else {
            console.log('Reloading '+handler.mod+' module...');
            mod = require('./routes/'+handler.mod+'.js');
        }
        if( typeof mod[handler.func] === 'function'){
            mod[handler.func](req,res);
        } else {
            console.log('Invalid callback function in router.');
            res.send(500);
        }
    }

    if(handler.method === 'get'){
        app.get(path, requestHandler);
    } else if(handler.method === 'post'){
        app.post(path, requestHandler);
    } else{
        console.log("Invalid http method!");
    }
}

//load routes in routesMap 
//bug：目前还不能重新加载routes。因为无法清除原有的routes。
function loadRouter(){
    //load routesMap from routes.json
    var routesMap = JSON.parse(fs.readFileSync( __dirname + '/routes/routes.json', 'utf8'));
    for(route in routesMap) {
        if( !Object.prototype.hasOwnProperty.call(routesMap,route) ) continue;
        startRouter(route,routesMap[route]);
    }

    app.get('/*', function(req, res){
            res.render('404',{status: 404, title:'404 - 文件未找到.', layout:false});
    });
};

loadRouter();

function watchMods(){

    function watchMod(modName,path){
        fs.watch(path,function (event,filename){
//            console.log('file: '+filename + '. event : ' + event);
            if(event === 'change'){  //如果模块文件发生变动
                console.log(filename+' is changed. Reloading '+path+'.')
                delete require.cache[path];
                modMap[modName].mod = require(path);
//                loadRouter();
            }
        });
    }

    for(var i in modMap){
        if( !Object.prototype.hasOwnProperty.call(modMap,i) ) continue;
        watchMod(i,modMap[i].path);
    }
}

function watchRoutes(){
    var routesFile =  __dirname + '/routes/routes.json';
    fs.watch(routesFile,function (event,filename){
        if(event === 'change'){  //如果routers.json发生变动
            console.log(filename+' is changed. Reloading router.')
            loadRouter();
        }
    });

}

//这两个方法不能工作，因为
// 1. fs.watch有时候检测不到vim编辑后的文件内容变动。
// 2. router不能清除，导致即便重新loadRouter(),也不能改变一开始设置的router。
//所以发生变动时，还是需要重新启动node.

//watchMods();
//watchRoutes();

app.listen(3000); //开始运行server，监听3000端口
console.log(('Guokr frontend build-tool server running on port ' + app.address().port + ' in ' + app.settings.env + ' mode'),'yellow');

