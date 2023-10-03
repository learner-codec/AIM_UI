girderTest.startApp();

var registeredUsers = [];

describe('Create an admin and non-admin user', function () {
    var link;

    it('register a user (first is admin)',
        girderTest.createUser('admin',
            'admin@girder.test',
            'Admin',
            'Admin',
            'adminpassword!',
            registeredUsers));

    it('create user as admin using dialog', function () {
        girderTest.goToUsersPage()();

        runs(function () {
            expect($('.g-user-create-button').length).toBe(1);
            $('.g-user-create-button').trigger('click');
        });
        girderTest.waitForDialog();

        runs(function () {
            $('#g-login').val('user2');
            $('#g-email').val('user2@girder.test');
            $('#g-firstName').val('user');
            $('#g-lastName').val('2');
            $('#g-password,#g-password2').val('password');

            $('#g-register-button').trigger('click');
        });

        waitsFor(function () {
            return $('.g-body-title.g-user-name').text() === 'user 2';
        }, 'new user page to appear');

        runs(function () {
            expect(girder.auth.getCurrentUser().get('login')).toBe('admin');
        });
    });

    it('logout', girderTest.logout());

    it('register another user',
        girderTest.createUser('nonadmin',
            'nonadmin@girder.test',
            'Not',
            'Admin',
            'password!',
            registeredUsers));

    it('view the users on the user page and click on one', function () {
        girderTest.goToUsersPage()();
        runs(function () {
            expect($('.g-user-list-entry').length).toBe(3);
            expect($('a.g-user-link').text()).toBe('user 2Admin AdminNot Admin');
        });

        runs(function () {
            $('a.g-user-link:contains("Admin Admin")').trigger('click');
        });

        waitsFor(function () {
            return $('.g-user-name').text() === 'Admin Admin';
        }, 'user page to appear');

        girderTest.waitForLoad();
        // check for actions menu
        runs(function () {
            expect($('button:contains("Actions")').length).toBe(0);
        });
    });

    it('check for no admin checkbox on user settings page', function () {
        girderTest.goToCurrentUserSettings()();
        runs(function () {
            expect($('input#g-admin').length).toBe(0);
        });
    });

    it('check redirect to front page after logout from user page', function () {
        girderTest.logout()();
        waitsFor(function () {
            return $('.g-frontpage-title:visible').length > 0;
        }, 'front page to display');
    });

    it('check the user count', function () {
        girderTest.login('admin', 'Admin', 'Admin', 'adminpassword!')();
        girderTest.goToUsersPage()();
        runs(function () {
            expect($('span.g-user-count').text()).toBe('3');
        });
    });

    it('check redirect to front page after logout from users list page', function () {
        girderTest.logout()();
        waitsFor(function () {
            return $('.g-frontpage-title:visible').length > 0;
        }, 'front page to display');
    });

    it('check for admin checkbox on admin user settings page', function () {
        girderTest.login('admin', 'Admin', 'Admin', 'adminpassword!')();
        girderTest.goToCurrentUserSettings()();
        runs(function () {
            expect($('input#g-admin').length).toBe(1);
        });
        runs(function () {
            $('#g-firstName').val('');
            $('button').has('.icon-edit').trigger('click');
        });
        waitsFor(function () {
            return $('#g-user-info-error-msg').text() === 'First name must not be empty.';
        }, 'Name error to occur');
        runs(function () {
            $('#g-firstName').val('Admin');
            $('button').has('.icon-edit').trigger('click');
        });
        waitsFor(function () {
            return $('#g-user-info-error-msg').text() === '';
        }, 'error to vanish');
    });

    it('test changing other user\'s password', function () {
        runs(function () {
            girder.router.navigate('useraccount/' + registeredUsers[1].id + '/password',
                { trigger: true });
        });

        waitsFor(function () {
            return $('input#g-password-new:visible').length > 0;
        }, 'password input to appear');
        girderTest.waitForLoad();

        runs(function () {
            expect($('.g-user-description').text()).toBe('nonadmin');
            expect($('#g-password-old').length).toBe(0);

            $('#g-password-new,#g-password-retype').val('a new password');
            $('#g-password-change-form button[type="submit"]').trigger('click');
        });

        waitsFor(function () {
            return $('#g-alerts-container .alert-success').length > 0 &&
                   $('#g-password-new').val() === '';
        }, 'password change to complete');
    });

    it('test reset password', function () {
        girderTest.logout()();
        runs(function () {
            $('.g-login').trigger('click');
        });
        girderTest.waitForDialog();
        waitsFor(function () {
            return $('input#g-login').length > 0;
        }, 'login dialog to appear');
        runs(function () {
            $('.g-forgot-password').trigger('click');
        });
        waitsFor(function () {
            return $('.g-password-reset-explanation').length > 0;
        }, 'forgotton password dialog to appear');
        girderTest.waitForDialog();
        runs(function () {
            $('#g-email').val('invalid@girder.test');
            $('#g-reset-password-button').trigger('click');
        });
        waitsFor(function () {
            return $('.g-validation-failed-message').text().indexOf(
                'not registered') >= 0;
        }, 'error message to appear');
        runs(function () {
            $('#g-email').val('nonadmin@girder.test');
            $('#g-reset-password-button').trigger('click');
        });
        girderTest.waitForLoad();
        runs(function () {
            console.log('__FETCHEMAIL__');
        });
        waitsFor(function () {
            var msg = window.callPhantom({
                action: 'fetchEmail',
                suffix: girderTest.getCallbackSuffix()
            });
            if (!msg || msg.indexOf('<a href="') < 0) {
                return false;
            }
            link = msg.substr(msg.indexOf('<a href="') + 9);
            link = link.substr(0, link.indexOf('"'));
            link = link.substr(link.indexOf('#'));
            return link;
        }, 'email to be received');
    });
    it('Use reset link', function () {
        runs(function () {
            girderTest.testRoute(link, false, function () {
                return $('#g-password-new:visible').length > 0 &&
                       $('#g-password-old:visible').length === 0;
            });
        });
        runs(function () {
            $('#g-password-new').val('newpassword');
            $('#g-password-retype').val('newpassword2');
            $('button').has('.icon-lock').trigger('click');
        });
        waitsFor(function () {
            return $('#g-password-change-error-msg').text() === 'Passwords do not match, try again.';
        }, 'password match error to occur');
        runs(function () {
            $('#g-password-new').val('new');
            $('#g-password-retype').val('new');
            $('button').has('.icon-lock').trigger('click');
        });
        waitsFor(function () {
            return $('#g-password-change-error-msg').text() === 'Password must be at least 6 characters.';
        }, 'password match error to occur');
        runs(function () {
            $('#g-password-new').val('newpassword');
            $('#g-password-retype').val('newpassword');
            $('button').has('.icon-lock').trigger('click');
        });
        waitsFor(function () {
            return $('#g-password-new').val() === '';
        }, 'new password to be accepted');
        runs(function () {
            window.callPhantom({
                action: 'uploadCleanup',
                suffix: girderTest._uploadSuffix
            });
        });
    });
});

describe('test the API key management tab', function () {
    it('go to the API keys tab', function () {
        runs(function () {
            $('.g-account-tabs li>a[name="apikeys"]').trigger('click');
        });
        waitsFor(function () {
            return $('.g-api-keys-empty-message').length > 0;
        }, 'tab to display');
    });

    it('create a new API key', function () {
        runs(function () {
            $('button.g-api-key-new').trigger('click');
        });
        girderTest.waitForDialog();

        runs(function () {
            expect($('.g-custom-scope-checkbox').length).toBeGreaterThan(3);
            expect($('#g-scope-mode-full:checked').length).toBe(1);
            expect($('#g-scope-mode-custom:checked').length).toBe(0);
            expect($('.g-custom-scope-checkbox').not(':disabled').length).toBe(0);

            $('#g-api-key-name').val('test key');

            // Test radio button and checkbox state
            $('#g-scope-mode-custom').trigger('click');
            expect($('#g-scope-mode-full:checked').length).toBe(0);
            expect($('#g-scope-mode-custom:checked').length).toBe(1);
            expect($('.g-custom-scope-checkbox:disabled').length).toBe(0);

            $('.g-save-api-key').trigger('click');
        });

        waitsFor(function () {
            return $('#g-dialog-container .g-validation-failed-message').text() ===
                'Custom scope list must not be empty.';
        }, 'API key validation failure to appear');

        runs(function () {
            $('.g-custom-scope-checkbox').first().trigger('click');
            $('.g-save-api-key').trigger('click');
        });
        girderTest.waitForLoad();

        runs(function () {
            var row = $('tr.g-api-key-container');
            expect(row.length).toBe(1);
            expect(row.find('td[col="name"]').text()).toBe('test key');
            expect(row.find('td[col="active"]').text()).toBe('Yes');
            expect(row.find('td[col="tokenDuration"]').text()).toBe('Default');
            expect(row.find('td[col="scope"]').text()).toBe('Custom scopes');
            expect(row.find('td[col="lastUse"]').text()).toBe('Never');
            expect(row.find('button.g-api-key-toggle-active.btn-warning').length).toBe(1);
        });
    });

    it('edit the API key', function () {
        runs(function () {
            $('button.g-api-key-edit').trigger('click');
        });
        girderTest.waitForDialog();

        runs(function () {
            $('#g-api-key-name').val('new name');
            $('#g-api-key-token-duration').val('20');
            $('#g-scope-mode-full').trigger('click');
            $('.g-save-api-key').trigger('click');
        });

        girderTest.waitForLoad();

        runs(function () {
            var row = $('tr.g-api-key-container');
            expect(row.length).toBe(1);
            expect(row.find('td[col="name"]').text()).toBe('new name');
            expect(row.find('td[col="active"]').text()).toBe('Yes');
            expect(row.find('td[col="tokenDuration"]').text()).toBe('20 days');
            expect(row.find('td[col="scope"]').text()).toBe('Full access');
            expect(row.find('td[col="lastUse"]').text()).toBe('Never');
            expect(row.find('button.g-api-key-toggle-active.btn-warning').length).toBe(1);
        });
    });

    it('deactivate/reactivate the API key', function () {
        runs(function () {
            $('.g-api-key-toggle-active').trigger('click');
        });
        girderTest.waitForDialog();
        runs(function () {
            $('#g-confirm-button').trigger('click');
        });
        girderTest.waitForLoad();

        runs(function () {
            var row = $('tr.g-api-key-container');
            expect(row.length).toBe(1);
            expect(row.find('td[col="name"]').text()).toBe('new name');
            expect(row.find('td[col="active"]').text()).toBe('No');
            expect(row.find('td[col="tokenDuration"]').text()).toBe('20 days');
            expect(row.find('td[col="scope"]').text()).toBe('Full access');
            expect(row.find('td[col="lastUse"]').text()).toBe('Never');
            expect(row.find('button.g-api-key-toggle-active.btn-success').length).toBe(1);

            $('.g-api-key-toggle-active').trigger('click');
        });

        waitsFor(function () {
            return $('button.g-api-key-toggle-active.btn-warning').length > 0;
        }, 'API key to reactivate');
    });

    it('delete the API key', function () {
        runs(function () {
            $('.g-api-key-delete').trigger('click');
        });
        girderTest.waitForDialog();
        runs(function () {
            $('#g-confirm-button').trigger('click');
        });
        girderTest.waitForLoad();
        waitsFor(function () {
            return $('tr.g-api-key-container').length === 0;
        }, 'API key to be removed from list');

        runs(function () {
            expect($('.g-api-keys-empty-message').length).toBe(1);
        });
    });
});

describe('test the API key management tab', function () {
    it('go to the two-factor authentication tab', function () {
        runs(function () {
            $('.g-account-tabs li>a[name="otp"]').trigger('click');
        });
        waitsFor(function () {
            return $('.g-account-otp-info-text').length > 0;
        }, 'tab to display');
    });

    it('begin activation of 2FA', function () {
        runs(function () {
            $('#g-user-otp-initialize-enable').trigger('click');
        });
        waitsFor(function () {
            return $('.g-account-otp-enter-manual').length > 0;
        }, 'OTP key parameters to display');
    });

    // Further client testing requires a Javascript TOTP implementation, which is too difficult to provide in the
    // current testing environment
});

describe('test email verification', function () {
    it('Turn on email verification', function () {
        girderTest.logout()();
        girderTest.login('admin', 'Admin', 'Admin', 'adminpassword!')();
        runs(function () {
            $('a.g-nav-link[g-target="admin"]').trigger('click');
        });
        waitsFor(function () {
            return $('.g-server-config').length > 0;
        }, 'admin page to load');
        girderTest.waitForLoad();
        runs(function () {
            $('.g-server-config').trigger('click');
        });
        waitsFor(function () {
            return $('input#g-core-cookie-lifetime').length > 0;
        }, 'settings page to load');
        girderTest.waitForLoad();
        runs(function () {
            $('#g-core-email-verification').val('required');
            $('.g-submit-settings').trigger('click');
        });
        waitsFor(function () {
            return girder.rest.numberOutstandingRestRequests() === 0;
        }, 'dialog rest requests to finish');
        girderTest.logout()();
    });
    it('Try to login without verifying email', function () {
        runs(function () {
            expect(girder.auth.getCurrentUser()).toBe(null);
        });

        waitsFor(function () {
            return $('.g-login').length > 0;
        }, 'Girder app to render');

        girderTest.waitForLoad();

        runs(function () {
            $('.g-login').trigger('click');
        });

        girderTest.waitForDialog();
        waitsFor(function () {
            return $('input#g-login').length > 0;
        }, 'login dialog to appear');

        runs(function () {
            $('#g-login').val('user2');
            $('#g-password').val('password');
            $('#g-login-button').trigger('click');
        });

        waitsFor(function () {
            return $('.g-validation-failed-message:contains("Email verification")').length > 0;
        }, 'email verification message to appear');

        runs(function () {
            $('a[data-dismiss="modal"]').trigger('click');
        });
    });
});

describe('test account approval', function () {
    it('Turn on approval policy', function () {
        girderTest.login('admin', 'Admin', 'Admin', 'adminpassword!')();
        runs(function () {
            $('a.g-nav-link[g-target="admin"]').trigger('click');
        });
        waitsFor(function () {
            return $('.g-server-config').length > 0;
        }, 'admin page to load');
        girderTest.waitForLoad();
        runs(function () {
            $('.g-server-config').trigger('click');
        });
        waitsFor(function () {
            return $('input#g-core-cookie-lifetime').length > 0;
        }, 'settings page to load');
        girderTest.waitForLoad();
        runs(function () {
            $('#g-core-registration-policy').val('approve');
            $('#g-core-email-verification').val('disabled');
            $('.g-submit-settings').trigger('click');
        });
        waitsFor(function () {
            return girder.rest.numberOutstandingRestRequests() === 0;
        }, 'dialog rest requests to finish');
        runs(function () {
            girder.router.navigate('user/' + registeredUsers[1].id,
                { trigger: true });
        });
        waitsFor(function () {
            return $('.g-disable-user').length > 0;
        }, 'user page to load');
        runs(function () {
            $('.g-disable-user').trigger('click');
        });
        waitsFor(function () {
            return girder.rest.numberOutstandingRestRequests() === 0;
        }, 'dialog rest requests to finish');
        girderTest.logout()();
    });
    it('Try to login a disabled user', function () {
        runs(function () {
            expect(girder.auth.getCurrentUser()).toBe(null);
        });

        waitsFor(function () {
            return $('.g-login').length > 0;
        }, 'Girder app to render');

        girderTest.waitForLoad();

        runs(function () {
            $('.g-login').trigger('click');
        });

        girderTest.waitForDialog();
        waitsFor(function () {
            return $('input#g-login').length > 0;
        }, 'login dialog to appear');

        runs(function () {
            $('#g-login').val('nonadmin');
            $('#g-password').val('newpassword');
            $('#g-login-button').trigger('click');
        });

        waitsFor(function () {
            return $('.g-validation-failed-message:contains("disabled")').length > 0;
        }, 'approval message to appear');

        runs(function () {
            $('a[data-dismiss="modal"]').trigger('click');
        });
    });
});
