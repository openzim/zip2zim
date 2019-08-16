///<reference path="./types.d.ts" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Uppy } from '@uppy/core';
import { Dashboard } from '@uppy/react';
import XHRUpload from '@uppy/xhr-upload';
import Url from '@uppy/url';
import GoogleDrive from '@uppy/google-drive';
import Dropbox from '@uppy/dropbox';

import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import { Line } from 'rc-progress';

const apiUrl = window.location.origin

interface AppState {
    uppy?: Uppy,
    requestId?: string,
    requestStatus?: 'pending' | 'failed' | 'complete' | 'downloaded',
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

        uppy.use(GoogleDrive, { companionUrl: `${apiUrl}`, id: 'GoogleDrive' });

        uppy.use(Dropbox, { companionUrl: `${apiUrl}`, id: 'Dropbox' });

        uppy.use(Url, { companionUrl: `${apiUrl}`, id: 'Url' });

        uppy.use(XHRUpload as any, {
            endpoint: `${apiUrl}/upload`,
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
        let frame;
        if (this.state.requestId) {
            if (this.state.requestStatus === 'complete') {
                frame = <>
                    <h3>✅ Success</h3>
                    <br />
                    <a className='download-zim' target='_blank' href={"/download/" + this.state.requestId} onClick={(ev) => {
                        ev.preventDefault();
                        window.open("/download/" + this.state.requestId);
                        this.setState({ ...this.state, requestStatus: 'downloaded' });
                    }}>💾 Download File</a>
                    <br />
                    <small>You will only be able to download the file once</small>
                </>;
            }
            else if (this.state.requestStatus === 'pending') {
                frame = <>
                    <h3>🏃 We're processing your file</h3>
                    <div style={{ maxWidth: '400px', margin: 'auto auto', textAlign: 'center' }}>
                        <strong style={{ fontSize: '1.5em' }}>{this.state.requestProgress || 0}%</strong>
                        <Line percent={this.state.requestProgress || 0} strokeWidth={4} strokeLinecap="round" strokeColor={'#87d068'} />
                    </div>
                </>;
            }
            else if (this.state.requestStatus === 'downloaded') {
                frame = <>
                    <p>🎉 Congratulations on Your Shiny New ZIM File</p>

                    <a href="/" style={{ fontSize: '1.5em' }}>⬅️ Upload Another ZIP</a>
                </>;
            }
            else {
                frame = <>
                    <h3>🤷‍ File not Available</h3>
                    <p>
                        We couldn't find the file you're looking for, it might be related to one of these:
                        <ul>
                            <li>🔥 We delete the ZIM file after it has been downloaded once</li>
                            <li>🔥 We delete ZIM files after a few hours</li>
                            <li>🗺 You may have followed an in-correct url</li>
                        </ul>
                    </p>

                    <a href="/" style={{ fontSize: '1.5em' }}>⬅️ Upload Another ZIP</a>
                </>;
            }
        }
        else {
            if (this.state.uppy) {
                frame = <>
                    <h2>Upload</h2>
                    <Dashboard uppy={this.state.uppy} plugins={['GoogleDrive', 'Dropbox', 'Url']} showProgressDetails={true} />
                </>;
            }
            else {
                frame = <>
                    <h3>Loading</h3>
                </>;
            }
        }
        return <div className="page">
            <h1>Zip2Zim</h1>
            <p>
                Upload a ZIP of HTML, CSS, JavaScript, etc. to convert it to a ZIM file.<br />
                There should be an <code>index.html</code> file at the root.<br />
                For more configuration instructions, see <a href="#configuration"><code>config.json</code></a>
            </p>
            <div className="frame">{frame}</div>
            <br />
            <h2>Example Zips</h2>
            <div className='examples'>
                <a href="/sample/simple.zip" className="example">Simple.zip</a>
                <a href="/sample/wpen 10.zip" className="example">Wikipedia English Sample.zip</a>
                <a href="/sample/testing_heuristics.zip" className="example">Testing Heuristics.zip</a>
                <a href="/sample/sunset.zip" className="example">Sunset.zip</a>
            </div>
            <br />
            <h2 id='configuration'><code>config.json</code></h2>
            <p>
                The <code>config.json</code> file (at the root of an uploaded zip) can be used to specify metadata for the ZIM file.<br />
                All properties are optional, defaults are shown below:<br />
                <pre>
                    <code className='javascript'>
                        {`{
    welcome: 'index.html',
    creator: 'Zip2Zim',
    description: 'Generated from a ZIP file by Zip2Zim',
    name: 'Zip2Zim archive',
    publisher: '',
    language: '',
    title: '',
    tags: '',
}`}
                    </code>
                </pre>
            </p>
            <br />
            <hr />
            <footer>Made by <a href="https://simmsreeve.com"><code>@ISNIT0</code></a> in Stockholm 🇸🇪 at the <a href="https://wiki.kiwix.org/wiki/Hackathon_Wikimania_2019">Kiwix 2019 Hackathon</a></footer>
        </div>;
    }
}

ReactDOM.render(<App />, document.querySelector('.cont'));


function getJSON(url: string) {
    return fetch(url).then(r => r.json());
}