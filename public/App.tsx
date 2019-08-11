import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Uppy } from '@uppy/core';
import * as XHRUpload from '@uppy/xhr-upload';
import { Dashboard } from '@uppy/react';

import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';

interface AppState {
    uppy?: Uppy,
    requestId?: string,
    requestStatus?: 'pending' | 'fail' | 'complete',
}

class App extends React.Component {
    state: AppState = {};

    componentDidMount() {
        const uppy = new Uppy({
            restrictions: { maxNumberOfFiles: 1 },
            autoProceed: true
        });

        const GoogleDrive = require('@uppy/google-drive');
        uppy.use(GoogleDrive, { companionUrl: 'http://localhost:3020', id: 'GoogleDrive' });

        const Dropbox = require('@uppy/dropbox');
        uppy.use(Dropbox, { companionUrl: 'http://localhost:3020', id: 'Dropbox' });

        uppy.use(XHRUpload as any, {
            endpoint: '/upload',
            fieldName: 'file',
        });

        uppy.on('complete', ({ successful }) => {
            const requestId = (successful[0] as any).response.body.id;
            this.setState({ ...this.state, requestId, requestStatus: 'pending' });
            setTimeout(() => this.checkRequestStatus());
        });

        this.setState({ ...this.state, uppy });
    }

    async checkRequestStatus() {
        if (this.state.requestStatus === 'pending') {
            const { complete, exists } = await getJSON(`/file/${this.state.requestId}`);

            let newStatus;
            if (complete && exists) {
                newStatus = 'complete';
            } else if (!complete && exists) {
                newStatus = 'pending';
            } else {
                newStatus = 'failed';
            }

            this.setState({ ...this.state, requestStatus: newStatus });

            if (newStatus === 'pending') {
                setTimeout(() => this.checkRequestStatus(), 1000);
            }
        }
    }

    render() {
        if (!this.state.uppy) {
            return <h1>Loading...</h1>
        } else {
            return <div>
                {
                    !this.state.requestId
                        ? <>
                            <h1>Upload</h1>
                            <Dashboard
                                uppy={this.state.uppy}
                                plugins={['GoogleDrive', 'Dropbox']}
                                showProgressDetails={true}
                            />
                        </>
                        :
                        this.state.requestStatus === 'complete'
                            ? <>
                                <h1>Complete!</h1>
                                <a href={`/download/${this.state.requestId}`}>Download Your ZIM</a>
                            </>
                            : this.state.requestStatus === 'fail'
                                ? <><h1>Fail</h1></>
                                : <><h1>Pending...</h1></>
                }
            </div>
        }
    }
}

ReactDOM.render(<App />, document.body);


function getJSON(url: string) {
    return fetch(url).then(r => r.json());
}