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
            <div className="card-panel" style={{float: 'none'}}>{this.props.message.user}: {this.props.message.body}</div>
        </div>);
    }
}

class Dialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dialogId: null,
            messages: []
        };
        dialog = this;
    }
    loadDialog(dialogId) {
        this.setState({dialogId: dialogId, messages: []});
        api.getHistory(dialogId, (messages) => {
            console.log('Got history');
            this.setState({messages: messages});
        });
    }
    render() {
        if (!this.props.dialogId) {
            return <div>Select dialog</div>;
        }
        window.setTimeout(() => {
            $('.dialog').animate({scrollTop: $('.dialog').height()});
        }, 0);
        return (<div className="dialog">
            <div className="messages">
                {this.state.messages.reverse().map((message, i) => {
                    return (<MessageItem message={message} key={i} />);
                })}
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
