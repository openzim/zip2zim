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
    requestStatus?: 'pending' | 'failed' | 'complete',
    requestProgress?: number,
}

class App extends React.Component {
    state: AppState = {};

    componentDidMount() {
        const uppy = new Uppy({
            restrictions: {
                maxNumberOfFiles: 1,
                allowedFileTypes: ['.zip'],
            },
            // autoProceed: true
        });

        const GoogleDrive = require('@uppy/google-drive');
        uppy.use(GoogleDrive, { companionUrl: 'http://localhost:1337', id: 'GoogleDrive' });

        const Dropbox = require('@uppy/dropbox');
        uppy.use(Dropbox, { companionUrl: 'http://localhost:1337', id: 'Dropbox' });

        const Url = require('@uppy/url');
        uppy.use(Url, { companionUrl: 'http://localhost:1337', id: 'Url' });

        uppy.use(XHRUpload as any, {
            endpoint: 'http://localhost:1337/upload',
            fieldName: 'file',
        });

        uppy.on('complete', ({ successful }) => {
            const requestId = (successful[0] as any).response.body.id;
            this.setState({ ...this.state, requestId, requestStatus: 'pending' });
            setTimeout(() => this.checkRequestStatus());
            window.history.pushState('', '', `/file/${requestId}`);
        });

        this.setState({ ...this.state, uppy });

        if (window.location.pathname.length > 2) {
            const requestId = window.location.pathname.split('/').slice(-1)[0];
            this.setState({ ...this.state, requestId, requestStatus: 'pending' });
            setTimeout(() => this.checkRequestStatus());
        }
    }

    async checkRequestStatus() {
        if (this.state.requestStatus === 'pending') {
            const { complete, exists, progress } = await getJSON(`/info/${this.state.requestId}`);

            let newStatus;
            if (complete && exists) {
                newStatus = 'complete';
            } else if (!complete && exists) {
                newStatus = 'pending';
            } else {
                newStatus = 'failed';
            }

            this.setState({ ...this.state, requestStatus: newStatus, requestProgress: progress });

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
                                plugins={['GoogleDrive', 'Dropbox', 'Url']}
                                showProgressDetails={true}
                            />
                        </>
                        :
                        this.state.requestStatus === 'complete'
                            ? <>
                                <h1>Complete!</h1>
                                <a href={`/download/${this.state.requestId}`}>Download Your ZIM</a>
                                <p>You will only be able to download the file once</p>
                            </>
                            : this.state.requestStatus === 'failed'
                                ? <><h1>Fail</h1></>
                                : <><h1>Pending... {this.state.requestProgress || 0}%</h1></>
                }
            </div>
        }
    }
}

ReactDOM.render(<App />, document.body);


function getJSON(url: string) {
    return fetch(url).then(r => r.json());
}