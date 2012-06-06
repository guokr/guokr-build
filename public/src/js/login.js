/**
 * login.js - 登录页
 * author: Carl.
 * 主要参考Ext的formPanel样例
 */

Ext.require([
    'Ext.form.*',
    'Ext.Img',
    'Ext.tip.QuickTipManager'
]);

Ext.onReady(function() {
    Ext.tip.QuickTipManager.init(); //提示框

    var submitOpts = {
            clientValidation: true,
            url: '/login',
            success: function(form, action) {
                if( action.result.logInStatus === 1 ){
                    Ext.Msg.alert('','登录成功，页面即将跳转。');
                    //跳转到首页
                    setTimeout('window.location = "/"',400);
                } else {
                    Ext.Msg.alert('错误','用户名和密码不匹配.');
                }
            },
            failure: function(form, action) {
                Ext.Msg.alert("登录",'表单提交失败.');
                console.log('action.failureType  ' + action.failureType );
                console.log('action.result  ' + action.result);
            }
        };

    var formPanel = Ext.widget('form', {
        renderTo: "logForm",
        frame: true,
        width: 350,
        style: 'margin:20px auto;font-size:14px;',
        
        bodyPadding: 10,
        bodyBorder: true,
        title: '登 录',

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
            validateOnBlur:false,
            validateOnChange:false,
            enableKeyEvents: true,
            listeners:{
                keydown: function(_this,e,eOpts){
                    if(e.getCharCode() === e.ENTER) //按下Enter键则focus到密码
                        Ext.select('input[name="passwordFake"]').first().focus();
                }
            },
            minLength: 2
        }, {
            xtype: 'textfield',
            name: 'passwordFake',
            fieldLabel: '密码',
            inputType: 'password',
            submitValue: false,     //真正的密码不会被上传
            style: 'margin-top:15px;',
            allowBlank: false,
            enableKeyEvents: true,
            listeners:{
                keydown: function(_this,e,eOpts){
                    if(e.getCharCode() === e.ENTER){ //按下Enter键则提交表单
                        var form = this.up('form').getForm(),
                            passwordInputFake = Ext.select('input[name=passwordFake]'),
                            passwordInput = Ext.select('input[name=password]');
                        //SHA1加密
                        passwordInput.first().dom.value = window.hex_sha1(passwordInputFake.first().dom.value);
                        form.submit(submitOpts);
                    }
                }
            },
            minLength: 2
        }, {
            xtype: 'hiddenfield',
            name: 'password'
        }, {
            xtype: 'checkboxfield',
            name: 'savecookie',
            fieldLabel: '一个月内不用再登录',
            hideLabel: true,
            style: 'margin-top:15px;',
            boxLabel: '一个月内不用再登录'
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
                id: 'submit',
                formBind: true,
                disabled: true,
                text: '登 录',
                width: 80,
                handler: function() {
                    var form = this.up('form').getForm(),
                        passwordInputFake = Ext.select('input[name=passwordFake]'),
                        passwordInput = Ext.select('input[name=password]');
                    //SHA1加密
                    passwordInput.first().dom.value = window.hex_sha1(passwordInputFake.first().dom.value);
                    form.submit(submitOpts);
                }
            }]
        }]
    });
});
