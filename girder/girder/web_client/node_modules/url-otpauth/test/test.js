//
// The MIT License (MIT)
//
// Copyright (c) 2014 Lorenzo Villani
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//

var assert = require('chai').assert;

var otpauth = require('../index');


describe('url-otpauth', function () {
    it('should parse the the minimal URI without raising errors', function () {
        otpauth.parse('otpauth://totp/alice@google.com?secret=JBSWY3DPEHPK3PXP');
        otpauth.parse('otpauth://hotp/alice@google.com?secret=JBSWY3DPEHPK3PXP&counter=0');
    });

    it('should properly deconstruct a minimal otpauth URL', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/alice@google.com?secret=JBSWY3DPEHPK3PXP'), {
            account: 'alice@google.com',
            digits: 6,
            issuer: '',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp'
        });
    });

    it('should properly deconstruct a minimal HOTP URL', function () {
        assert.deepEqual(otpauth.parse('otpauth://hotp/alice@google.com?secret=JBSWY3DPEHPK3PXP&counter=123'), {
            account: 'alice@google.com',
            counter: 123,
            digits: 6,
            issuer: '',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'hotp'
        });
    });

    it('should properly deconstruct an otpauth URL with issuer in the label', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP'), {
            account: 'alice@google.com',
            digits: 6,
            issuer: 'Example',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp'
        });
    });

    it('should properly deconstruct an otpauth URL with issuer in the label and parametrs', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example'), {
            account: 'alice@google.com',
            digits: 6,
            issuer: 'Example',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp'
        });
    });

    it('should properly deconstruct an otpauth URL with custom number of digits', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&digits=8'), {
            account: 'alice@google.com',
            digits: 8,
            issuer: 'Example',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp'
        });
    });

    it('should properly deconstruct an otpauth URL with issuer in the parameters and without issuer in the label', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/github.com/alice?issuer=GitHub&secret=JBSWY3DPEHPK3PXP'), {
            account: 'github.com/alice',
            digits: 6,
            issuer: 'GitHub',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp'
        });
    });

    it('should properly deconstruct an otpauth URL with algorithm', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA512'), {
            account: 'alice@google.com',
            digits: 6,
            issuer: 'Example',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp',
            algorithm: 'SHA512'
        });
    });

    it('should properly deconstruct an otpauth URL with period', function () {
        assert.deepEqual(otpauth.parse('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&period=30'), {
            account: 'alice@google.com',
            digits: 6,
            issuer: 'Example',
            key: 'JBSWY3DPEHPK3PXP',
            type: 'totp',
            period: 30
        });
    });

    it('should fail with an error parsing an URL with a wrong protocol', function onWrong() {
        assert.throws(function () {
            otpauth.parse('bogus');
        }, otpauth.OtpauthInvalidURL);

        assert.throws(function () {
            otpauth.parse('nototpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail with an unrecognized OTP type', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://nototp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail when the account name is missing', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://totp/?secret=JBSWY3DPEHPK3PXP');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail when the secret is missing', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://totp/alice@google.com');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail when the label contains way too many commas', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://totp/issuer1:issuer2:issuer3:alice@google.com?secret=JBSWY3DPEHPK3PXP');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail when the account name is present but issuer is expected but missing', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://totp/:alice@google.com?secret=JBSWY3DPEHPK3PXP');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should throw an error if issuer parameter and the one in the label are different', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=OtherExample');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail with an error for HOTP URIs missing the counter', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://hotp/alice@google.com?secret=JBSWY3DPEHPK3PXP');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail with an error for digits parameter out of bounds', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://hotp/alice@google.com?secret=JBSWY3DPEHPK3PXP&digits=7');
        }, otpauth.OtpauthInvalidURL);
    });

    it('should fail with an error for unknown algorithm', function () {
        assert.throws(function () {
            otpauth.parse('otpauth://hotp/alice@google.com?secret=JBSWY3DPEHPK3PXP&algorithm=SHA2');
        }, otpauth.OtpauthInvalidURL);
    });
});
