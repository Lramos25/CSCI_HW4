'use strict;';

var crypto = require('crypto');
module.exports = function () {
    return {
        userList: [],

        save: function (user) {
            user.id = crypto.randomBytes(20).toString('hex'); 
            this.userList.push(user);
            return 1;
        },

        find: function (id) {
            if (id) {
                return this.userList.find(function (element) {
                    return element.id === id;
                });
            }
            else {
                return this.userList;
            }
        },
        findOne: function (name) {
            if (name) {
                return this.userList.find(function (element) {
                    return element.username === name;
                });
            }
            else {
                return this.userList;
            }
        },

        remove: function (id) {
            var found = 0;
            this.userList = this.userList.filter(function (element) {
                if (element.id === id) {
                    found = 1;
                }
                else {
                    return element.id !== id;
                }
            });
            return found;
        },

        update: function (id, user) {
            var userIndex = this.userList.findIndex(function (element) {
                return element.id === id;
            });
            if (userIndex !== -1) {
                this.userList[userIndex].username = user.username;
                this.userList[userIndex].password = user.password;
                return 1;
            }
            else {
                return 0;
            }
        }
    };
};
