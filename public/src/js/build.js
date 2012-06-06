/* 
 * author: Carl
 * build.js  - 工作页面
 * description: 
 * 
 */
Ext.Loader.setConfig({
    enabled: true
});

Ext.require([
    'Ext.grid.*',
    'Ext.tree.*',
    'Ext.data.*',
    'Ext.panel.*',
    'Ext.selection.CheckboxModel',
    'Ext.toolbar.TextItem',
    'Ext.layout.container.Border'
]);

Ext.onReady(function() {

    window.USER_HAD_INPUT = false;

    //trim string
    function trim(str){
        return str.replace(/(^\s*)|(\s*$)/g, ''); 
    }

    if(typeof Array.prototype.indexOf !== 'function'){  //for IE 678, add indexOf method to Array.prototype
        Array.prototype.indexOf = function(x){
            var i,item;
            for(i=-1; item=this[++i];){
                if(x===item)
                    return i;
            }
            return -1;
        }
    }
    if(typeof console !== 'object'){
        console = {
            log: function(){}
        };
    } else if(typeof console.log !== 'function'){
        console.log = function(){};
    }

    // Init QuickTipManager to enable actioncolumn.tooltip.
    Ext.tip.QuickTipManager.init();
    Ext.Ajax.timeout = 1800000; // set timeout to 30 minutes

    //the data store of file tree in the side bar
    var fileTreeStore = Ext.create('Ext.data.TreeStore', {
        proxy: {
            type: 'ajax',
            url: '/getfiletree',
            reader: {
                type: 'json'
            }
        },
        fields: ['text','LastModified'],
        root: {
            text: 'src',
            expanded: true
        },
        storeId:'fileTreeStore'
    });

    //file tree panel in the side bar
    var fileTreePanel = Ext.create('Ext.tree.Panel', {
        itemId: 'fileTree',
        region: 'west',
        store: fileTreeStore,
        title: '文件列表',
        width: '20%',
        split:true,
        rootVisible: true,
        autoScroll:true
    });

    //when checkchanged in the fileTreePanel
    fileTreePanel.on('checkchange', function(node, checked){
        window.USER_HAD_INPUT = true;
        if(checked){
            node.expand();
        } else {
            //node.collapse();
        }
        node.cascadeBy(function(child){
            child.set('checked', checked);
            /* // recursively expand would be a large cost
            if(checked){
                child.expand();
            } else {
                child.collapse();
            }
            */
        });
        //set file grid panel
        var records = fileTreePanel.getView().getChecked(),
            items = [];
        Ext.Array.each(records, function(rec){
            if( rec.get('leaf') ){
                var path = [],
                    r = rec;
                while(r.parentNode !== null){   //get file path
                    path.push(r.get('text'));
                    r = r.parentNode;
                }
                var obj = {
                    Name: rec.get('text'),
                    LastModified: rec.get('LastModified'),
                    Path: path.reverse().join('/')
                };
                //get file status in hgStatus
                if(window.hgStatus != null && window.hgStatus[obj.Path] != null){
                    obj.Status = window.hgStatus[obj.Path];
                } else {
                    obj.Status = '';
                }
                items.push(obj);
            }
        });

        //update the main panel
        fileGridStore.removeAll();
        fileGridStore.add(items);
        selModel.selectAll();
    },fileTreePanel);

    // Assign the changeLayout function to be called on tree node click.
    fileTreePanel.on('itemclick', function(view, node, item, index, e, eOpts) {
        if( e.getTarget('input') === null ){     //event's target is not checkbox. else the checkchage is already fired
            var checked = !(node.get('checked'));
            node.set('checked',checked);
            fileTreePanel.fireEvent('checkchange', node, checked);  
        }
    });

    //the data store for the main panel
    var fileGridStore = Ext.create('Ext.data.Store', {
        storeId:'FileStore',
        fields:['Name', 'LastModified', 'Path', 'Status']
    });

    var selModel = Ext.create('Ext.selection.CheckboxModel', {
        mode: 'SIMPLE',     //when clicked, select each one seperately
        listeners: {
            selectionchange: function(sm, selections) {
                window.USER_HAD_INPUT = true;
                var disabled = selections.length == 0;  //if nothing selected, disable the buttons blow
                fileGridPanel.down('#buildButton').setDisabled(disabled);
                fileGridPanel.down('#updateVersionButton').setDisabled(disabled);
                fileGridPanel.down('#proxyButton').setDisabled(disabled);
                fileGridPanel.down('#importButton').setDisabled(disabled);
            }
        }
    }); 
    
    /* The Ajax function for call build functions at server. 
     * @param opts: {{string}action {int|string}filePath {function}success {function}failure}
     * @returns 
     * description:
     * This function is called by the buttons in fileGridPanel
     * filePath can be string or an int. If filePath is 0 && we need to fetch all selected files in fileGridPanel
     * success and failure functions take response.responseText as parameter.
    */
    function ajaxBuild (opts){
        var action = opts.action,
            filePath = opts.filePath,
            successFn = opts.success,
            failureFn = opts.failure;
        if(filePath === 0 ){     //fetch all selected files in fileGridPanel
            var records = selModel.selected,
                i, filePath = [];
            for( i=0; i<records.length;i++){
                filePath.push(records.get(i).get('Path'));
            }
        }
        var waitingMsg = '正在进行' + action + 
            ((Object.prototype.toString.call(filePath)==='[object Array]' &&     //more than 3 files
            filePath.length>3) ? '，文件较多，请耐心等待...' : ', 请稍等...');
        
        var loading  = action === 'build'? 'build' :
                ['circle','spinner','pacman'][Math.floor(Math.random()*3)];
        var msgBox = Ext.create('Ext.window.MessageBox',{
                    html:'<img style="width:64px;height:64px;margin:0px auto;display:block" src="/skin/imgs/loaders/'+loading+'.gif"/>'
                });
        msgBox.show({
            width:300,
            msg: waitingMsg
        });
        Ext.Ajax.request({
            method:'POST',
            url:'/buildfile',
            params:{
                action: action,
                filePath: filePath
            },
            timeout: 1800000,
            callback:function(options, success, response){
                msgBox.destroy();
                //pop a window to show the response text
                var responseWindow = Ext.create('Ext.window.Window', {
                    title: '构建结果',
                    layout: {
                        type: 'auto',
                        align: 'center'
                    },
                    minHeight:100,
                    minWidth:300,
                    maxHeight:600,
                    maxWidth:800,
                    items: [{ 
                        xtype: 'component',
                        style: {
                            background: '#f0f0ff',
                            padding: '10px',
                            maxWidth: '750px',
                            maxHeight: '600px'
                        },
                        autoScroll: true,
                        html: response.responseText
                    },{
                        xtype: 'button',
                        text: 'OK',
                        width: 100,
                        height: 25,
                        handler: function(){
                            responseWindow.destroy();
                        }
                    }]
                }).show();
                if(success){
                    if( typeof successFn === 'function'){
                        success(response.responseText);
                    }
                } else {
                    if( typeof failureFn === 'function'){
                        failure(response.responseText);
                    }
                }
            }
        });
    }

    //the updateVersion prompt window
    var updateVersionPromptWindow = Ext.create('Ext.window.Window', {
        frame: false,
        title: '更新版本号需要的参数',
        layout: 'anchor',
        width: 500,
        items: [{
            xtype: 'fieldcontainer',
            fieldLabel: '目录',
            labelAlign: 'right',
            labelWidth: 65,
            layout:'hbox',
            margin:'10 5 5 5',
             items:[{
                 xtype: 'textfield',
                 value: '/nutshell/templates/',
                 id: 'updatePath',
                 name: 'updatePath',
                 hideLabel: true,
                 width: 160,
                 allowBlank: false,
             },{
                 xtype: 'splitter'
             }, {
                 xtype: 'label',
                 text: '需更新版本号的目录的绝对路径.请在行首补上guokr主目录的路径(支持"~")',
                 flex:1
             }]
        },{
            xtype: 'fieldcontainer',
            fieldLabel: '版本号',
            labelAlign: 'right',
            labelWidth: 65,
            margin:'10 5 5 5',
            layout:'hbox',
             items:[{
                 xtype: 'textfield',
                 value: '',
                 id: 'versionString',
                 name: 'versionString',
                 blankText : '请填写新的版本号',
                 hideLabel: true,
                 width: 160,
                 allowBlank: false,
             },{
                 xtype: 'splitter'
             }, {
                 xtype: 'label',
                 text: '修改后的新版本号',
                 flex:1
             }]
        }],
        dockedItems: [{
            xtype: 'container',
            dock: 'bottom',
            width: 300,
            padding: '10 10 5',
            layout: {
                type: 'hbox',
                align: 'middle'
            },
            items:[{
                xtype: 'button',
                text: 'OK',
                width: 100,
                height: 25,
                handler: function(){
                    updateVersionPromptWindow.hide();
                    var updatePath = updateVersionPromptWindow.down('#updatePath').value,
                        versionString = updateVersionPromptWindow.down('#versionString').value;
                    ajaxUpdateVersion(updatePath,versionString);
                }
            },{
                xtype: 'button',
                text: 'Cancel',
                width: 100,
                margin:'0 0 0 10',
                height: 25,
                handler: function(){
                    updateVersionPromptWindow.hide();
                }
            }]
        }]
    });

    //call the server to update version number
    function ajaxUpdateVersion(updatePath,versionString){
        var records = selModel.selected,
            i, filePaths = [];
        for( i=0; i<records.length;i++){
            filePaths.push(records.get(i).get('Path'));
        }
        var waitingMsg = '正在更新版本号，请稍等...';
        
        var loading  = ['circle','spinner','pacman'][Math.floor(Math.random()*3)];
        var msgBox = Ext.create('Ext.window.MessageBox',{
                    html:'<img style="width:64px;height:64px;margin:0px auto;display:block" src="/skin/imgs/loaders/'+loading+'.gif"/>'
                });
        msgBox.show({
            width:300,
            msg: waitingMsg
        });
        Ext.Ajax.request({
            method       : 'POST',
            url          : '/updateversion',
            params : {
                filePaths: filePaths,
                updatePath: updatePath,
                versionString: versionString
            },
            callback:function(options, success, response){
                msgBox.destroy();
                //pop a window to show the response text
                var responseWindow = Ext.create('Ext.window.Window', {
                    title: '更新结果',
                    layout: {
                        type: 'auto',
                        align: 'center'
                    },
                    minHeight:100,
                    minWidth:300,
                    maxHeight:600,
                    maxWidth:800,
                    items: [{ 
                        xtype: 'component',
                        style: {
                            background: '#f0f0ff',
                            padding: '10px',
                            maxWidth: '750px',
                            maxHeight: '600px'
                        },
                        autoScroll: true,
                        html: response.responseText
                    },{
                        xtype: 'button',
                        text: 'OK',
                        width: 100,
                        height: 25,
                        handler: function(){
                            responseWindow.destroy();
                        }
                    }]
                }).show();
            }
        });
    }

    //Send filter request to server. 
    //Get called when pressed enter in filter textfield or clicked filterButton and the query start with 'hg:'.
    function ajaxFilter(filterQuery){
        fileGridStore.clearFilter(true);    //clear filter on data store
        var records = fileGridStore.data.items,
            i, filePath = [], record;
        for( i=-1; record = records[++i]; ){
            filePath.push(record.get('Path'));
        };

        Ext.Ajax.request({
            method       : 'POST',
            url          : '/filter',
            params : {
                query    : filterQuery,
                filePath : filePath
            },
            callback:function(options, success, response){
                var result = JSON.parse(response.responseText),
                    records =[];
                if(success && Object.prototype.toString.call(result) === '[object Array]'){
                    fileGridStore.filterBy(function(record, id){    //filter by the filted result at server side.
                        if( result.indexOf(record.get('Path'))>-1 ){
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    selModel.selectAll();
                } else {
                    Ext.Msg.alert('过滤请求失败');
                }
            }
        });
    }

    //Filter file paths at local. 
    //Get called when pressed enter in filter textfield or clicked filterButton and the query start with 'hg:'.
    function localFilter(filterQuery){
        fileGridStore.clearFilter(true);    //clear filter on data store
        var records = fileGridStore.data.items,
            querys = filterQuery.split(/\s+/),
            i, query;

        fileGridStore.filterBy(function(record, id){    //filter by the splited query 
            var file = record.get('Path');
            for(i=-1; query = querys[++i]; ){
                if(!(RegExp(query,'i').test(file)))
                    return false;
            }
            return true;
        });
        selModel.selectAll();
    }

    // the grid panel in the main container
    var fileGridPanel = Ext.create('Ext.grid.Panel', {
        store: fileGridStore,
        itemId: 'gridPanel',
        region: 'center',
        height: 420,
        autoScroll:true,
        split: true,
        title: '工作面板',
        selModel: selModel,
        columnLines: true,
        viewConfig: {
            getRowClass: function(record, rowIndex, rowParams, store){
                return record.get('Status') ? 'x-grid-row-with-status' : '';
            }
        },
        columns: [
            {text: '文件名', width: 150, dataIndex: 'Name', sortable: true},
            {text: '文件路径', width: 320, dataIndex: 'Path', sortable: true},
            {text: '状态', width: 42, dataIndex: 'Status', sortable: true},
            {text: '最后修改时间', width: 150,xtype:'datecolumn',format:'Y-m-d H:i:s', dataIndex: 'LastModified', sortable: true},
            {
                xtype: 'actioncolumn',
                header: '操作',
                flex : true,
                items:[{
                    icon: '/skin/imgs/icons/build.png',
                    tooltip: '构建',
                    getClass: function(){
                        return 'x-grid-icon';
                    },
                    handler: function(grid, rowIndex, colIndex){
                        var rec = grid.getStore().getAt(rowIndex);
                        ajaxBuild({
                            action: 'build',
                            filePath:rec.get('Path')
                        });
                    }
                },{
                    icon: '/skin/imgs/icons/import.png',
                    tooltip: '合并',
                    getClass: function(){
                        return 'x-grid-icon';
                    },
                    handler: function(grid, rowIndex, colIndex){
                        var rec = grid.getStore().getAt(rowIndex);
                        ajaxBuild({
                            action: 'import',
                            filePath:rec.get('Path')
                        });
                    }
                },{
                    icon: '/skin/imgs/icons/connect.png',
                    tooltip: '代理',
                    getClass: function(){
                        return 'x-grid-icon';
                    },
                    handler: function(grid, rowIndex, colIndex){
                        var rec = grid.getStore().getAt(rowIndex);
                        ajaxBuild({
                            action: 'proxy',
                            filePath:rec.get('Path')
                        });
                    }
                },{
                    icon: '/skin/imgs/icons/dependency.png',
                    tooltip: '显示依赖图',
                    getClass: function(){
                        return 'x-grid-icon';
                    },
                    handler: function(grid, rowIndex, colIndex){
                        var rec = grid.getStore().getAt(rowIndex);
                        ajaxBuild({
                            action: 'getDependency',
                            filePath:rec.get('Path')
                        });
                    }
                }]
            }
        ],
        dockedItems: [{
            xtype: 'toolbar',
            items: [{
                text:'构建',
                xtype:'button',
                itemId:'buildButton',
                tooltip: '构建选中文件、文件夹',
                minWidth:75,
                disabled: true,
                listeners: {
                    click:function(){
                        ajaxBuild({
                            action: 'build',
                            filePath: 0
                        });
                    }
                }
            }, '-', {
                text:'合并',
                xtype:'button',
                itemId:'importButton',
                tooltip: 'import选中文件、文件夹',
                minWidth:75,
                disabled: true,
                listeners: {
                    click:function(){
                        ajaxBuild({
                            action: 'import',
                            filePath: 0
                        });
                    }
                }
            }, '-', {
                text:'更新版本号',
                xtype:'button',
                itemId:'updateVersionButton',
                tooltip: '更新所有引用到被选中文件的引用版本号',
                minWidth: 105,
                disabled: true,
                listeners: {
                    click:function(){
                        updateVersionPromptWindow.show(null,function(){
                            function moveCursorToHome(){
                                var updatePathInput = updateVersionPromptWindow.down('#updatePath');
                                updatePathInput.focus();
                            }
                            setTimeout(moveCursorToHome,100);
                        });
                    }
                }
            }, '-', {
                text:'代理',
                xtype:'button',
                itemId:'proxyButton',
                tooltip: '代理选中文件、文件夹',
                minWidth:75,
                disabled: true,
                listeners: {
                    click:function(){
                        ajaxBuild({
                            action: 'proxy',
                            filePath: 0
                        });
                    }
                }
            }, ' ', {
                text:'取消所有代理',
                xtype:'button',
                itemId:'cancelProxyBtton',
                tooltip: '取消所有以前代理过的文件代理',
                minWidth:110,
                listeners: {
                    click:function(){
                        ajaxBuild({
                            action: 'cancelAllProxy',
                            filePath: 0,
                            success: function(data){
                                console.log('data:' + data);
                            }
                        });
                    }
                }
            }, '->',{
                xtype: 'textfield',
                name:'filterQuery',
                width: 200,
                enableKeyEvents: true,
                listeners:{
                    keydown: function(_this,e,eOpts){
                        var filterQuery = trim(Ext.select('input[name=filterQuery]').first().dom.value);
                        if(e.getCharCode() === e.ENTER){    //按下Enter键则发送filter请求
                            if(filterQuery.indexOf('hg:') !== 0){   //not start with 'hg:', filter at local
                                localFilter(filterQuery);
                            }
                            else{   //start with 'hg:', send ajax request to server
                                ajaxFilter(filterQuery);
                            }
                        }
                    }
                },
                emptyText:'输入过滤条件'
            },{
                xtype: 'button',
                itemId: 'filterButton',
                width:60,
                text:'过滤',
                listeners:{
                    click: function(_this,e,eOpts){
                        var filterQuery = trim(Ext.select('input[name=filterQuery]').first().dom.value);
                        if(filterQuery.indexOf('hg:') !== 0){   //not start with 'hg:', filter at local
                            localFilter(filterQuery);
                        }
                        else{   //start with 'hg:', send ajax request to server
                            ajaxFilter(filterQuery);
                        }
                    }
                }
            }]
        }]
    });

    // create an instance of the app
    var fileApp = Ext.create('Ext.Panel',{
        renderTo: 'buildContainer',
        height: 720,
        layout: 'border',
        autoScroll: true,
        items:[fileTreePanel,fileGridPanel]
    });
    
    Ext.Ajax.request({
        url:'/getHgStatus',
        method:'get',
        timeout:20000,
        callback:function(options,success,response){
            var data = response.responseText;
            if(success){
                window.hgStatus = JSON.parse(data);
            } else {
                Ext.Msg.alert('错误','无法获取hg status信息.');
            }
            if(!window.USER_HAD_INPUT){
                var root = fileTreeStore.getRootNode(),
                    items = [];
                for(file in window.hgStatus){
                    if(!Object.prototype.hasOwnProperty.call(window.hgStatus,file))
                        continue;
                    var dirs = file.split('/'),
                        curDir,
                        curItem = root;
                    while(curItem){
                        curDir = dirs.shift();
                        curItem.expand();
                        curItem = curItem.findChild('text',curDir,false);
                        if(!curItem || curItem.isLeaf()) //search end
                            break;
                    }
                    if(curItem){
                        curItem.set('checked',true);
                        items.push({
                            Name: curItem.get('text'),
                            LastModified: curItem.get('LastModified'),
                            Path: file,
                            Status: window.hgStatus[file]
                        });
                    }
                }

                //update the main panel
                fileGridStore.add(items);
                selModel.selectAll();
            }
        }
    });
});
