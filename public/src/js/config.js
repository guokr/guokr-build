Ext.require([
    'Ext.form.*',
    'Ext.data.*'
]);

Ext.onReady(function(){

    var formPanel = Ext.create('Ext.form.Panel', {
        renderTo: 'configContainer',
        frame: true,
        title:'构建工具配置',
        width: 800,
        bodyPadding: 5,
        style: 'margin:20px auto;',
        waitMsgTarget: true,

        fieldDefaults: {
            labelAlign: 'right',
            labelWidth: 105,
            msgTarget: 'side'
        },

        items: [{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'base',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: '/home/zmm/work/',
                         name: 'base',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '基础工作目录，所有的分支都存于此目录中',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'binPath',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: './',
                         name: 'binPath',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '相对于每个分支根目录的构建完成后的文件目录，即线上使用的文件',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'srcPath',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: 'src/',
                         name: 'srcPath',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '相对于每个分支根目录的源文件目录',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'updatePaths',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: '{base}/zone;{base}/cooperation',
                         name: 'updatePaths',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '需要更新引用文件版本号的目录',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldset',
                    title: 'Compress',
                    items: [{
                         xtype: 'label',
                         text: '编译工具的命令，css使用yuicompressor，js使用google的.',
                         width: 320,
                         margin: '0 0 0 90',
                         flex:1
                     },{
                             xtype: 'textfield',
                             value: 'java -jar {toolPath}/yuicompressor-2.4.6.jar {srcPath} --type css --charset utf-8 -o {binPath}',
                             name: 'csscmd',
                             fieldLabel: 'css',
                             width:650,
                             allowBlank: false,
                     },{
                             xtype: 'textfield',
                             value: 'java -jar {toolPath}/compiler.jar --warning_level QUIET --js {srcPath} --js_output_file {binPath}',
                             name: 'jscmd',
                             width:650,
                             fieldLabel: 'js',
                             allowBlank: false,
                         }]
                },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'js',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: 'js/',
                         name: 'js',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '相对于源文件目录或者上线文件目录的js文件目录',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'skin',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: 'skin/',
                         name: 'skin',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '相对于源文件目录或者上线文件目录的css及图片文件目录',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'zone',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: 'zone/',
                         name: 'zone',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '相对于源文件目录的专区文件目录',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'author',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: 'mzhou',
                         name: 'author',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '当前开发者代号',
                         flex:1
                     }]
                 },{
                    xtype: 'fieldcontainer',
                    fieldLabel: 'versionInfo',
                     layout:'hbox',
                     items:[{
                         xtype: 'textfield',
                         value: '/* author: {author}, date: {date} */',
                         name: 'versionInfo',
                         hideLabel: true,
                         width: 228,
                         allowBlank: false,
                     },{
                         xtype: 'splitter'
                     }, {
                         xtype: 'label',
                         text: '构建完成后会被添加到文件最上部的基本信息',
                         flex:1
                     }]
                 }],

        buttons: [{
            text: '保存',
            disabled: true,
            formBind: true,
            width: 100,
            handler: function(){
                 var form = this.up('form').getForm();

               form.submit({
                    clientValidation: true,
                    waitMsg: '保存配置中...',
                    url: '/saveconfig',
                    success: function(form, action) {
                        //...
                        // console.log(action.result);
                        if( action.result.saveStatus === 1 ){
                        //    Ext.Msg.alert('','配置保存成功，页面即将跳转。');
                        // use server's res.redirect instead. -- but it does not work.
                            window.location = "/";
                        } else {
                            Ext.Msg.alert('错误','错误代码:'+action.result.errorcode);
                        }
                    },
                    failure: function(form, action) {
                        //...
                        Ext.Msg.alert("",'表单提交失败.');
                        console.log('action.failureType  ' + action.failureType );
                        console.log('action.result  ' + action.result);
                    }
                });
            }
        },{
            xtype:'box',
            autoEl:{tag: 'a', href: '/build', html: '跳转到工作页面'}
        }]
    });

    //加载配置到表单中，用Ext.select实现。
    function loadConfig(conf){
       if( typeof CONFIG_OBJ !== 'object' || CONFIG_OBJ === null )
           return;
       var obj = CONFIG_OBJ;
       for( var i in obj ){
           if( !Object.prototype.hasOwnProperty.call(obj,i) ) continue;
           if( i === 'compress' ){
               Ext.select('input[name=jscmd]').first().dom.value = obj[i].js;
               Ext.select('input[name=csscmd]').first().dom.value = obj[i].css;
           } else {
               Ext.select('input[name='+i+']').first().dom.value = obj[i];
           }
       }
    }

    if( CONFIG_OBJ != null ){
        loadConfig(CONFIG_OBJ);
    }
});
