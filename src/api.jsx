const storage = electronRequire('electron-json-storage');

export class Api {
    authorize(callback) {
        storage.get('data', (error, data) => {
            if (data.token) {
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

    request(method, data, callback) {
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
            console.error(error);
        });
    }

    getDialogs(callback) {
        this.request('messages.getDialogs', {}, (json) => {
            var dialogs = json.response.slice(1);
            this.getUsers(dialogs.map((dialog) => dialog.uid), (users) => {
                dialogs.forEach((dialog) => {
                    dialog.user = users[dialog.uid].first_name + ' ' + users[dialog.uid].last_name;
                });
                callback(dialogs);
            });
        });
    }

    getUsers(user_ids, callback) {
        this.request('users.get', {user_ids: user_ids.join(','), fields: 'screen_name'}, (json) => {
            var usersObject = {};
            var users = json.response;
            users.forEach((user) => {
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
                    message.user = users[message.from_id].first_name + ' ' + users[message.from_id].last_name;
                });
                callback(messages);
            });
        });
    }
}
