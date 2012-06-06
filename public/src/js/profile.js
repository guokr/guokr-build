Ext.require([
    'Ext.form.*',
    'Ext.Img',
    'Ext.tip.QuickTipManager'
]);

Ext.onReady(function() {
    Ext.tip.QuickTipManager.init();

    function validatePassword(){

    }


    var changePasswordPanel = Ext.widget('form', {
        renderTo: "changePasswordForm",
        frame: true,
        width: 350,
        style: 'margin:20px auto;font-size:14px;',
        
        bodyPadding: 10,
        bodyBorder: true,
        title: '修改密码',

        defaults: {
            anchor: '100%'
        },
        fieldDefaults: {
            labelAlign: 'left',
            msgTarget: 'none',
            invalidCls: '' //unset the invalidCls so individual fields do not get styled as invalid
        },

        /*
         * Listen for validity change on the entire form and update the combined error icon
         */
        listeners: {
            fieldvaliditychange: function() {
                this.updateErrorState();
            },
            fielderrorchange: function() {
                this.updateErrorState();
            }
        },

        updateErrorState: function() {
            var me = this,
                errorCmp, fields, errors;

            if (me.hasBeenDirty || me.getForm().isDirty()) { //prevents showing global error when form first loads
                errorCmp = me.down('#formErrorState');
                fields = me.getForm().getFields();
                errors = [];
                fields.each(function(field) {
                    Ext.Array.forEach(field.getErrors(), function(error) {
                        errors.push({name: field.getFieldLabel(), error: error});
                    });
                });
                errorCmp.setErrors(errors);
                me.hasBeenDirty = true;
            }
        },

        items: [{
            xtype: 'textfield',
            name: 'oldPasswordFake',
            fieldLabel: '当前密码',
            inputType: 'password',
            submitValue: false,     //真正的密码不会被上传
            style: 'margin-top:15px;',
            allowBlank: false,
            minLength: 2
        }, {
            xtype: 'hiddenfield',
            name: 'oldpassword',
        }, {
            xtype: 'textfield',
            name: 'newPasswordFake',
            fieldLabel: '新密码',
            inputType: 'password',
            submitValue: false,     //真正的密码不会被上传
            style: 'margin-top:15px;',
            allowBlank: false,
            validateOnChange:false,
            minLength: 2
        }, {
            xtype: 'textfield',
            name: 'newPasswordFakeRepeat',
            fieldLabel: '重复密码',
            inputType: 'password',
            submitValue: false,     //真正的密码不会被上传
            style: 'margin-top:15px;',
            allowBlank: false,
            validateOnChange:false,
            validator: function(val){
                var anotherVal = Ext.select('input[name="newPasswordFake"]').first().dom.value;
                if(anotherVal==='') return "";
                if(val === anotherVal)
                    return true;
                else
                    return '两次输入的密码不一样';
            },
            minLength: 2
        }, {
            xtype: 'hiddenfield',
            name: 'newpassword',
        } ],

        dockedItems: [{
            xtype: 'container',
            dock: 'bottom',
            layout: {
                type: 'hbox',
                align: 'middle'
            },
            padding: '10 10 5',

            items: [{
                xtype: 'component',
                id: 'formErrorState',
                baseCls: 'form-error-state',
                invalidText: '表单中有错误.',
                validationDelay : 500,
                flex: 1,
                tipTpl: Ext.create('Ext.XTemplate', '<ul><tpl for="."><li><span class="field-name">{name}</span>: <span class="error">{error}</span></li></tpl></ul>'),

                getTip: function() {
                    var tip = this.tip;
                    if (!tip) {
                        tip = this.tip = Ext.widget('tooltip', {
                            target: this.el,
                            title: '错误:',
                            autoHide: false,
                            anchor: 'top',
                            mouseOffset: [-11, -2],
                            closable: true,
                            constrainPosition: false,
                            cls: 'errors-tip'
                        });
                        tip.show();
                    }
                    return tip;
                },

                setErrors: function(errors) {
                    var me = this,
                        baseCls = me.baseCls,
                        tip = me.getTip();

                    errors = Ext.Array.from(errors);

                    // Update CSS class and tooltip content
                    if (errors.length) {
                        me.addCls(baseCls + '-invalid');
                        me.removeCls(baseCls + '-valid');
                        me.update(me.invalidText);
                        tip.setDisabled(false);
                        tip.update(me.tipTpl.apply(errors));
                    } else {
                        me.addCls(baseCls + '-valid');
                        me.removeCls(baseCls + '-invalid');
                        me.update(me.validText);
                        tip.setDisabled(true);
                        tip.hide();
                    }
                }
            }, {
                xtype: 'button',
                formBind: true,
                disabled: true,
                text: '提 交',
                width: 80,
                handler: function() {
                    var form = this.up('form').getForm(),
                        oldPasswordInputFake = Ext.select('input[name=oldPasswordFake]'),
                        oldPasswordInput = Ext.select('input[name=oldpassword]');
                        newPasswordInputFake = Ext.select('input[name=newPasswordFake]'),
                        newPasswordInput = Ext.select('input[name=newpassword]');
                    oldPasswordInput.first().dom.value = window.hex_sha1(oldPasswordInputFake.first().dom.value);
                    newPasswordInput.first().dom.value = window.hex_sha1(newPasswordInputFake.first().dom.value);

                    form.submit({
                        clientValidation: true,
                        url: '/changepassword',
                        success: function(form, action) {
                            //...
                            // console.log(action.result);
                            if( action.result.changePasswordStatus === 1 ){
                                Ext.Msg.alert('','密码修改成功,即将跳转到首页。');
                                //跳转到首页
                                setTimeout('window.location = "/"',1000);
                            } else if( action.result.changePasswordStatus === 2 ){
                                Ext.Msg.alert('失败','旧密码输入不正确。');
                            } else {
                                Ext.Msg.alert('错误','密码修改失败');
                            }
                        },
                        failure: function(form, action) {
                            //...
                            Ext.Msg.alert("登录",'表单提交失败.');
                            console.log('action.failureType  ' + action.failureType );
                            console.log('action.result  ' + action.result);
                        }
                    });
                  }
            }]
        }]
    });

    var newUserPanel = Ext.widget('form', {
        renderTo: "newUserForm",
        frame: true,
        width: 350,
        style: 'margin:50px auto;font-size:14px;margin-bottom:20px;',
        
        bodyPadding: 10,
        bodyBorder: true,
        title: '添加帐号',

        defaults: {
            anchor: '100%'
        },
        fieldDefaults: {
            labelAlign: 'left',
            msgTarget: 'none',
            invalidCls: '' //unset the invalidCls so individual fields do not get styled as invalid
        },

        /*
         * Listen for validity change on the entire form and update the combined error icon
         */
        listeners: {
            fieldvaliditychange: function() {
                this.updateErrorState();
            },
            fielderrorchange: function() {
                this.updateErrorState();
            }
        },

        updateErrorState: function() {
            var me = this,
                errorCmp, fields, errors;

            if (me.hasBeenDirty || me.getForm().isDirty()) { //prevents showing global error when form first loads
                errorCmp = me.down('#formErrorState');
                fields = me.getForm().getFields();
                errors = [];
                fields.each(function(field) {
                    Ext.Array.forEach(field.getErrors(), function(error) {
                        errors.push({name: field.getFieldLabel(), error: error});
                    });
                });
                errorCmp.setErrors(errors);
                me.hasBeenDirty = true;
            }
        },

        items: [{
            xtype: 'textfield',
            name: 'username',
            fieldLabel: '用户名',
            allowBlank: false,
            minLength: 2
        }, {
            xtype: 'textfield',
            name: 'newUserPasswordFake',
            fieldLabel: '密码',
            inputType: 'password',
            submitValue: false,     //真正的密码不会被上传
            style: 'margin-top:15px;',
            allowBlank: false,
            validateOnChange:false,
            minLength: 2
        }, {
            xtype: 'textfield',
            name: 'newUserPasswordFakeRepeat',
            fieldLabel: '重复密码',
            inputType: 'password',
            submitValue: false,     //真正的密码不会被上传
            style: 'margin-top:15px;',
            allowBlank: false,
            validateOnChange:false,
            validator: function(val){
                var anotherVal = Ext.select('input[name="newUserPasswordFake"]').first().dom.value;
                if(anotherVal==='') return "";
                if(val === anotherVal)
                    return true;
                else
                    return '两次输入的密码不一样';
            },
            minLength: 2
        }, {
            xtype: 'hiddenfield',
            name: 'newuserpassword',
        }],

        dockedItems: [{
            xtype: 'container',
            dock: 'bottom',
            layout: {
                type: 'hbox',
                align: 'middle'
            },
            padding: '10 10 5',

            items: [{
                xtype: 'component',
                id: 'formErrorState',
                baseCls: 'form-error-state',
                invalidText: '表单中有错误.',
                validationDelay : 500,
                flex: 1,
                tipTpl: Ext.create('Ext.XTemplate', '<ul><tpl for="."><li><span class="field-name">{name}</span>: <span class="error">{error}</span></li></tpl></ul>'),

                getTip: function() {
                    var tip = this.tip;
                    if (!tip) {
                        tip = this.tip = Ext.widget('tooltip', {
                            target: this.el,
                            title: 'Error Details:',
                            autoHide: false,
                            anchor: 'top',
                            mouseOffset: [-11, -2],
                            closable: true,
                            constrainPosition: false,
                            cls: 'errors-tip'
                        });
                        tip.show();
                    }
                    return tip;
                },

                setErrors: function(errors) {
                    var me = this,
                        baseCls = me.baseCls,
                        tip = me.getTip();

                    errors = Ext.Array.from(errors);

                    // Update CSS class and tooltip content
                    if (errors.length) {
                        me.addCls(baseCls + '-invalid');
                        me.removeCls(baseCls + '-valid');
                        me.update(me.invalidText);
                        tip.setDisabled(false);
                        tip.update(me.tipTpl.apply(errors));
                    } else {
                        me.addCls(baseCls + '-valid');
                        me.removeCls(baseCls + '-invalid');
                        me.update(me.validText);
                        tip.setDisabled(true);
                        tip.hide();
                    }
                }
            }, {
                xtype: 'button',
                formBind: true,
                disabled: true,
                text: '提 交',
                width: 80,
                handler: function() {
                    var form = this.up('form').getForm(),
                        passwordInputFake = Ext.select('input[name=newUserPasswordFake]'),
                        passwordInput = Ext.select('input[name=newuserpassword]');
                    passwordInput.first().dom.value = window.hex_sha1(passwordInputFake.first().dom.value);

                    form.submit({
                        clientValidation: true,
                        url: '/newuser',
                        success: function(form, action) {
                            //...
                            // console.log(action.result);
                            if( action.result.newUserStatus === 1 ){
                                Ext.Msg.alert('','已经成功添加用户，即将跳转到首页。');
                                //跳转到首页
                                setTimeout('window.location = "/"',1000);
                            } else if( action.result.newUserStatus === 2 ){
                                Ext.Msg.alert('错误','用户名已存在');
                            } else {
                                Ext.Msg.alert('错误','添加用户失败');
                            }
                        },
                        failure: function(form, action) {
                            //...
                            Ext.Msg.alert("登录",'表单提交失败.');
                            console.log('action.failureType  ' + action.failureType );
                            console.log('action.result  ' + action.result);
                        }
                    });

                }
            }]
        }]
    });

});
