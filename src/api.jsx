const storage = electronRequire('electron-json-storage');

export class Api {
    authorize(callback) {
        // storage.set('data', null);
        storage.get('data', (error, data) => {
            if (data && data.token) {
                console.log('Cached token:', data.token);
                this.token = data.token;
                callback();
            } else {
                var windowProxy = window.open('https://oauth.vk.com/authorize?client_id=3502561&response_type=token&scope=friends,audio,offline,messages&display=mobile');
                var poll = () => {
                    var url = windowProxy.location.toString();
                    if (url.indexOf('#access_token=') !== -1) {
                        var token = url.match(/access_token=([\d\w]+)/)[1];
                        console.log('Obtained token:', token);
                        storage.set('data', {token: token})
                        this.token = token;
                        windowProxy.close();
                        callback();
                    } else {
                        window.setTimeout(poll, 250);
                    }
                };
                poll();
            }
        });
    }

    request(method, data, callback, onError) {
        data = data || {};
        data = $.extend({}, data, {access_token: this.token});
        fetch('https://api.vk.com/method/' + method + '?' + $.param(data), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify(data)
        }).then(
            (response) => response.json()
        ).then(
            (json) => callback(json)
        ).catch((error) => {
            console.error('request error:', error);
            onError && onError(error);
        });
    }

    getDialogs(callback) {
        this.request('messages.getDialogs', {preview_length: 40}, (json) => {
            var dialogs = json.response.slice(1);
            console.log('Dialogs:', dialogs);
            this.getUsers(dialogs.map((dialog) => dialog.uid), (users) => {
                dialogs.forEach((dialog) => {
                    dialog.user = users[dialog.uid];
                    dialog.body = dialog.body.replace(/\<br\>/, '\n');
                });
                callback(dialogs);
            });
        }, (error) => {
            callback([]);
        });
    }

    getUsers(user_ids, callback) {
        this.request('users.get', {user_ids: user_ids.join(','), fields: 'screen_name,photo_100'}, (json) => {
            var usersObject = {};
            var users = json.response;
            users.forEach((user) => {
                user.full_name = user.first_name + ' ' + user.last_name;
                usersObject[user.uid] = user;
            });
            callback(usersObject);
        });
    }

    getHistory(user_id, callback) {
        this.request('messages.getHistory', {user_id: user_id}, (json) => {
            var messages = json.response.slice(1);
            console.log('Messages:', messages);
            this.getUsers(messages.map((message) => message.from_id), (users) => {
                messages.forEach((message) => {
                    message.user = users[message.from_id];
                    message.body = message.body.replace(/\<br\>/, '\n')
                });
                messages.reverse();
                callback(messages);
            });
        });
    }

    sendMessage(user_id, message) {
        this.request('messages.send', {user_id: user_id, message: message}, (json) => {
            console.log('Message sent?', json);
        });
    }

    getLongPollServer(callback, onError) {
        this.request('messages.getLongPollServer', {}, (json) => {
            callback(json.response)
        }, onError);
    }

    // getLongPollHistory(ts, callback) {
    //     this.request('messages.getLongPollHistory', {ts: ts}, (json) => {
    //         callback(json.response);
    //     });
    // }

    _poll(server, key, ts, callbacks, isConnected) {
        var wait = isConnected ? 15 : 1;
        console.log('Polling...');
        fetch(`https://${server}?act=a_check&key=${key}&ts=${ts}&wait=${wait}&mode=2&version=1`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        }).then(
            (response) => response.json()
        ).then(
            (json) => {
                console.log('Poll result:', json);
                json.updates.forEach((update) => {
                    if (update[0] == 4) {
                        // New message
                        this.getUsers([update[3]], (users) => {
                            callbacks.onEvent({
                                user: users[update[3]],
                                uid: update[3],
                                body: update[6].replace(/\<br\>/, '\n'),
                                out: update[2] & 2
                            });
                        });
                    }
                });
                // callback(json);
                setTimeout(this._poll.bind(this, server, key, json.ts, callbacks, true), 0);
            }
        ).catch((error) => {
            if (isConnected === true) {
                callbacks.onDisconnect();
                isConnected = false;
            }
            console.error(error);
            setTimeout(this.startPolling.bind(this, callbacks, isConnected), 3000);
        });

        // this.getLongPollHistory(ts, (info) => {
        // });
    }

    startPolling(callbacks, isConnected) {
        this.getLongPollServer((info) => {
            callbacks.onConnect();
            console.log('Long poll info:', info);
            this._poll(info.server, info.key, info.ts, callbacks, true);
        }, (error) => {
            if (isConnected == true) {
                callbacks.onDisconnect();
                isConnected = false;
            }
            setTimeout(this.startPolling.bind(this, callbacks, isConnected), 3000);
        });
    }

    stopPolling(callback) {

    }
}
