import { Api } from './api';

var api = new Api();
var app = null;
var dialog = null;

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
    render() {
        return <a href="#" className="collection-item" onClick={() => {
            app.loadDialog(this.getDialogID())
        }}><b>{this.props.dialog.user}</b><br />{this.props.dialog.body}</a>;
    }
}

class MessageItem extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (<div>
            <div className="card-panel" style={{float: this.props.message.out ? 'right' : 'left'}}>{this.props.message.out ? 'Me' : this.props.message.user}: {this.props.message.body}</div>
            <div style={{clear: 'both'}}></div>
        </div>);
    }
}

class Dialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dialogId: null,
            messages: [],
            message: ''
        };
        dialog = this;
    }
    loadDialog(dialogId) {
        this.setState({dialogId: dialogId, messages: []});
        api.getHistory(dialogId, (messages) => {
            console.log('Got history for dialog', dialogId);
            this.setState({messages: messages});
        });
    }
    addMessage(message) {
        this.state.messages.push(message);

        this.setState({
            messages: this.state.messages,
        });
    }
    render() {
        if (!this.props.dialogId) {
            return <div>Select dialog</div>;
        }
        window.setTimeout(() => {
            $('.messages').animate({scrollTop: $('.messages-items').height()}, 200);
        }, 0);
        return (<div className="dialog">
            <div className="messages">
                <div className="messages-items">
                    {this.state.messages.map((message, i) => {
                        return (<MessageItem message={message} key={i} />);
                    })}
                </div>
            </div>
            <div className="panel">
                <div className="horizontal-flex">
                    <input type="text" className="flex-expand" placeholder="Type your message..." value={this.state.message} onChange={(e) => this.setState({message: e.target.value})} />
                    <input type="button" className="btn" value="Send" onClick={(e) => {
                        api.sendMessage(this.state.dialogId, this.state.message);
                        this.setState({message: ''});
                    }} />
                </div>
            </div>
        </div>);
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            dialogs: []
        };

        api.authorize(() => {
            console.log('Welcome!');

            api.startPolling((message) => {
                console.log('New message:', message);

                var found = false;
                this.state.dialogs.forEach((dialog) => {
                    if (dialog.uid == message.uid) {
                        found = true;
                        dialog.from = message.from;
                        dialog.body = message.body;
                    }
                });
                if (!found) {
                    this.state.dialogs.unshift(message);
                }
                this.setState({dialogs: this.state.dialogs});

                if (message.uid == dialog.state.dialogId) {
                    dialog.addMessage(message);
                }
            });

            api.getDialogs((dialogs) => {
                this.setState({dialogs: dialogs});
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

    render() {
        return (
            <page>
                <div className="row">
                    <div className="col s6 m4 l2">
                        <Sidebar/>
                    </div>
                    <div className="col s6 m8 l10">
                        <Dialog dialogId={this.state.dialogId} />
                    </div>
                </div>
            </page>
        );
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById('root')
);
