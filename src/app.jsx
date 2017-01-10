import { Api } from './api';

var api = new Api();
var app = null;
var dialog = null;
var currentDialogId = null;

class Spinner extends React.Component {
    render() {
        return (
            <div>
                <div className="preloader-wrapper big active">
                    <div className="spinner-layer spinner-blue-only">
                        <div className="circle-clipper left">
                            <div className="circle"></div>
                        </div><div className="gap-patch">
                            <div className="circle"></div>
                        </div><div className="circle-clipper right">
                            <div className="circle"></div>
                        </div>
                    </div>
                </div>
                <div style={{color: '#4285f4', marginTop: '10px', fontWeight: 300, fontSize: 24}}>{this.props.message}</div>
            </div>
        );
    }
}

class Sidebar extends React.Component {
    render() {
        return (<div className="sidebar">
            <div className="collection">
                {app.state.dialogs.map((dialog, i) => {
                    return <DialogItem dialog={dialog} key={i} />;
                })}
            </div>
        </div>);
    }
}

class DialogItem extends React.Component {
    constructor(props) {
        super(props);
    }
    getDialogID() {
        if (this.props.dialog.chat_id) {
            return this.props.dialog.chat_id + 2000000000;
        } else {
            return this.props.dialog.uid;
        }
    }
    getClass() {
        var classes = ['collection-item dialog-item'];

        if (this.props.dialog.out == 0 && this.props.dialog.read_state == 0) {
            classes.push('dialog-item-unread-in');
        } else if (this.props.dialog.out == 1 && this.props.dialog.read_state == 0) {
            classes.push('dialog-item-unread-out');
        }

        if (this.getDialogID() == currentDialogId) {
            classes.push('dialog-item-current');
        }

        return classes.join(' ');
    }
    render() {
        return (
            <a href="#" className={this.getClass()} onClick={() => {
                app.loadDialog(this.getDialogID())
            }}>
                <div className="horizontal-flex">
                    <div>
                        <img src={this.props.dialog.user.photo_100} width="50" height="50" />
                    </div>
                    <div className="flex-expand" style={{paddingLeft: '10px'}}>
                        <b>{this.props.dialog.user.full_name}</b><br />
                        {this.props.dialog.body ? this.props.dialog.body : 'Attachment'}
                    </div>
                    <div>
                        <div className="pin"></div>
                    </div>
                </div>
            </a>
        );
    }
}

class MessageItem extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        var sender;
        // var attachment = (this.props.message.attachments && this.props.message.attachments[0].photo) ? <div><img src={this.props.message.attachments[0].photo.src} class="responsive-img" /></div> : '';
        if (this.props.message.out) {
            sender = <div><b>You</b></div>;
        } else {
            sender = (
                <div className="horizontal-flex">
                    <div>
                        <img src={this.props.message.user.photo_100} style={{width: '32px', height: '32px'}} />
                    </div>
                    <div className="flex-expand" style={{paddingLeft: '10px'}}>
                        <b>{this.props.message.user.full_name}</b>
                    </div>
                </div>
            );
        }
        return (<div>
            <div className="card-panel" style={{float: this.props.message.out ? 'right' : 'left', padding: '5px', marginTop: '0', marginBottom: '15px', minWidth: '30%', maxWidth: '80%'}}>
                {sender}
                {this.props.message.body}
                {this.getAttachments()}
            </div>
            <div style={{clear: 'both'}}></div>
        </div>);
    }
    getAttachments() {
        var output = '';
        if (!this.props.message.attachments) {
            return;
        }
        this.props.message.attachments.forEach((attachment) => {
            console.log(attachment);
            if (attachment.type == 'photo') {
                output = <div><img src={attachment.photo.src_big} className="responsive-img" /></div>;
            } else {
                output = <div className="error">Unsupported attachment type: {attachment.type}</div>;
            }
        });
        return output;
    }
}

class Dialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dialogId: null,
            loading: false,
            messages: [],
            message: ''
        };
        dialog = this;
    }
    loadDialog(dialogId) {
        currentDialogId = dialogId;
        this.setState({dialogId: dialogId, messages: [], loading: true});
        api.getHistory(dialogId, (messages) => {
            console.log('Got history for dialog', dialogId);
            this.setState({messages: messages, loading: false});
            window.setTimeout(() => {
                $('#message-input').focus();
            }, 0);
        });
    }
    addMessage(message) {
        this.state.messages.push(message);

        this.setState({
            messages: this.state.messages,
        });
    }
    sendMessage() {
        api.sendMessage(this.state.dialogId, this.state.message);
        this.setState({message: ''});
    }
    render() {
        if (!this.props.dialogId) {
            return <div></div>;
        }
        window.setTimeout(() => {
            $('.messages').animate({scrollTop: $('.messages-items').height()}, 0);
        }, 0);
        var content = null;
        if (this.state.loading) {
            content = (
                <div className="flex-expand flex-center center-align">
                    <Spinner message="Loading dialog" />
                </div>
            );
        } else {
            content = (
                <div className="messages">
                    <div className="messages-items">
                        {this.state.messages.map((message, i) => {
                            return (<MessageItem message={message} key={i} />);
                        })}
                    </div>
                </div>
            );
        }
        return (<div className="dialog">
            {content}
            <div className="panel">
                <div className="horizontal-flex">
                    <input
                        id="message-input"
                        type="text"
                        className="flex-expand"
                        placeholder="Type your message..."
                        value={this.state.message}
                        onChange={(e) => this.setState({message: e.target.value})}
                        onKeyPress={(e) => e.which == 13 ? this.sendMessage() : false}
                        style={{margin: '4px 0', borderBottom: '0 none', boxShadow: 'none'}}
                    />
                    <input type="button" className="btn blue" value="Send" onClick={(e) => this.sendMessage()} style={{marginLeft: '10px'}} />
                </div>
            </div>
        </div>);
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            dialogs: [],
            state: 1
        };

        api.authorize(() => {
            console.log('Welcome!');

            this.setState({state: 2});

            api.startPolling({
                onMessage: (message) => {
                    console.log('New message:', message);

                    var found = false;
                    this.state.dialogs.forEach((dialog, i) => {
                        if (dialog.uid == message.uid) {
                            found = i;
                            dialog.from = message.from;
                            dialog.body = message.body;
                            if (message.out) {
                                dialog.read_state = 0;
                            }
                        }
                    });
                    if (found === false) {
                        this.state.dialogs.unshift(message);
                    } else {
                        this.state.dialogs.unshift(this.state.dialogs.splice(found, 1)[0]);
                    }
                    this.setState({dialogs: this.state.dialogs});

                    if (message.uid == dialog.state.dialogId) {
                        dialog.addMessage(message);
                    }
                },
                onRead: (uid) => {
                    this.state.dialogs.forEach((dialog, i) => {
                        if (dialog.uid == uid) {
                            dialog.read_state = 1;
                        }
                    });
                    if (uid == dialog.state.dialogId) {
                        // dialog.addMessage(message);
                    }
                    this.setState({dialogs: this.state.dialogs});
                },
                onDisconnect: () => {
                    console.log('Disconnected');
                    this.setState({state: 3});
                },
                onConnect: () => {
                    console.log('Connected');

                    api.getDialogs((dialogs) => {
                        this.setState({state: 0, dialogs: dialogs});
                    });
                }
            });
        });
        app = this;
    }

    loadDialog(dialogId) {
        this.setState({
            dialogId: dialogId
        });
        dialog.loadDialog(dialogId);
    }

    getStateMessage() {
        if (this.state.state == 1) {
            return 'Waiting for authorization';
        } else if (this.state.state == 2) {
            return 'Connecting';
        } else if (this.state.state == 3) {
            return 'Trying to reconnect'
        }
    }

    render() {
        if (this.state.state == 0) {
            return (
                <page>
                    <div className="row">
                        <div className="col s6 m4 l3 no-padding">
                            <Sidebar/>
                        </div>
                        <div className="col s6 m8 l9 no-padding">
                            <Dialog dialogId={this.state.dialogId} />
                        </div>
                    </div>
                </page>
            );
        } else {
            return (
                <page className="horizontal-flex">
                    <div className="flex-expand flex-center">
                        <div className="center-align">
                            <Spinner message={this.getStateMessage()} />
                        </div>
                    </div>
                </page>
            );
        }
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById('root')
);
