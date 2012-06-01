# Guokr前端构建工具

## 特性
### 代码合并
Javascript使用以下注释形式：

    //@import "a.js";
    //@import "../b.js";

CSS支持默认import方式：

    @import "a.css";
    @import "../b.css";

import 指定的代码文件会被合并。

### 代码压缩
可选用YUI compressor或Closure Compiler压缩合并后代码，见配置。
也可以使用[ublifyjs](https://github.com/mishoo/UglifyJS)压缩代码

### 支持Mercurial(hg)
支持hg版本库，即：若你的源文件目录是hg版本库，则工具会自动列出修改中或刚被添加的文件。
此功能与：

    $ hg status -ma

得到的结果一样

### 修改版本号
可以修改指定目录模版中的前端文件版本号，例如：

    <script src="/skin/g.css"></script>

修改成

    <script src="/skin/g.css?2.5.6"></script>

### 多账户支持
可配置多账户公用一个构建工具，每个账户单独使用一个配置文件。
并且可通过配置author，来修改构建成功后文件中的作者名

## 安装
1. 依赖：Mac or Linux操作系统
2. 安装[nodejs](http://nodejs.org/) 0.6+
3. 安装Mercurial(hg)及python 2.7+(ubuntu 默认有python)
3. 可选安装 jre，以支持Google clousure和YUI compressor压缩工具
4. 可选安装 redis，详见配置部分
4. 启动：$ node app.js
5. 浏览器访问：http://127.0.0.1:3000

## 配置
1. 默认用户名为guokr,密码为guokr.
2. 默认以development模式启动。需要以production模式启动时，执行命令 NODE_ENV=production node app.js
3. 配置页面中可以配置项目路径。base路径必须为hg repo的根目录，否则无法从hg获取代码版本信息。
4. 根目录下的config.json是构建工具的配置文件，格式为json。
   maxProcess为最大并发的java进程总数，默认为20。数量过大时可能会耗尽系统内存。
   jsCompiler为js文件的压缩工具，默认为closure(google提供的压缩工具)。可以修改为'uglify-js'，即使用uglify-js来压缩js代码。
   sessionStore为session数据存取配置。默认为connect，可修改为'redis'。
5. 为了更好的session支持,构建工具可以选择redis为session数据存取。如果遇到错误 "Error: Redis connection to 127.0.0.1:6379 failed - connect ECONNREFUSED",
   需要开启redis-server服务(执行redis-server命令,可自定义redis.conf配置,取代默认的/etc/redis/redis.conf)。
   如果未安装redis-server,可以用sudo apt-get install redis-server类似的命令来安装。


##其他
[guokr前端Javascript模块库](https://github.com/guokr/G.js)
