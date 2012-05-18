/* author: carl, date: Mon Feb 06 2012 14:58:54 GMT+0800 (CST) */Ext.require(["Ext.form.*","Ext.Img","Ext.tip.QuickTipManager"]);
Ext.onReady(function(){Ext.tip.QuickTipManager.init();var d={clientValidation:!0,url:"/login",success:function(b,a){1===a.result.logInStatus?(Ext.Msg.alert("","登录成功，页面即将跳转。"),setTimeout('window.location = "/"',400)):Ext.Msg.alert("错误","用户名和密码不匹配.")},failure:function(b,a){Ext.Msg.alert("登录","表单提交失败.");console.log("action.failureType  "+a.failureType);console.log("action.result  "+a.result)}};Ext.widget("form",{renderTo:"logForm",frame:!0,width:350,style:"margin:20px auto;font-size:14px;",bodyPadding:10,
bodyBorder:!0,title:"登 录",defaults:{anchor:"100%"},fieldDefaults:{labelAlign:"left",msgTarget:"none",invalidCls:""},listeners:{fieldvaliditychange:function(){this.updateErrorState()},fielderrorchange:function(){this.updateErrorState()}},updateErrorState:function(){var b,a,c;if(this.hasBeenDirty||this.getForm().isDirty())b=this.down("#formErrorState"),a=this.getForm().getFields(),c=[],a.each(function(a){Ext.Array.forEach(a.getErrors(),function(b){c.push({name:a.getFieldLabel(),error:b})})}),b.setErrors(c),
this.hasBeenDirty=!0},items:[{xtype:"textfield",name:"username",fieldLabel:"用户名",allowBlank:!1,validateOnBlur:!1,validateOnChange:!1,enableKeyEvents:!0,listeners:{keydown:function(b,a){a.getCharCode()===a.ENTER&&Ext.select('input[name="passwordFake"]').first().focus()}},minLength:2},{xtype:"textfield",name:"passwordFake",fieldLabel:"密码",inputType:"password",submitValue:!1,style:"margin-top:15px;",allowBlank:!1,enableKeyEvents:!0,listeners:{keydown:function(b,a){if(a.getCharCode()===a.ENTER){var c=
this.up("form").getForm(),e=Ext.select("input[name=passwordFake]");Ext.select("input[name=password]").first().dom.value=window.hex_sha1(e.first().dom.value);c.submit(d)}}},minLength:2},{xtype:"hiddenfield",name:"password"},{xtype:"checkboxfield",name:"savecookie",fieldLabel:"一个月内不用再登录",hideLabel:!0,style:"margin-top:15px;",boxLabel:"一个月内不用再登录"}],dockedItems:[{xtype:"container",dock:"bottom",layout:{type:"hbox",align:"middle"},padding:"10 10 5",items:[{xtype:"component",id:"formErrorState",baseCls:"form-error-state",
invalidText:"表单中有错误.",validationDelay:500,flex:1,tipTpl:Ext.create("Ext.XTemplate",'<ul><tpl for="."><li><span class="field-name">{name}</span>: <span class="error">{error}</span></li></tpl></ul>'),getTip:function(){var b=this.tip;if(!b)b=this.tip=Ext.widget("tooltip",{target:this.el,title:"Error Details:",autoHide:!1,anchor:"top",mouseOffset:[-11,-2],closable:!0,constrainPosition:!1,cls:"errors-tip"}),b.show();return b},setErrors:function(b){var a=this.baseCls,c=this.getTip(),b=Ext.Array.from(b);
b.length?(this.addCls(a+"-invalid"),this.removeCls(a+"-valid"),this.update(this.invalidText),c.setDisabled(!1),c.update(this.tipTpl.apply(b))):(this.addCls(a+"-valid"),this.removeCls(a+"-invalid"),this.update(this.validText),c.setDisabled(!0),c.hide())}},{xtype:"button",id:"submit",formBind:!0,disabled:!0,text:"登 录",width:80,handler:function(){var b=this.up("form").getForm(),a=Ext.select("input[name=passwordFake]");Ext.select("input[name=password]").first().dom.value=window.hex_sha1(a.first().dom.value);
b.submit(d)}}]}]})});
