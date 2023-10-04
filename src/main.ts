// Used this as a starting point:
// https://github.com/microsoft/azure-pipelines-tasks/blob/88ec5139c28625ea228d3a40f662454cd2f5dd44/Tasks/GitHubCommentV0/main.ts#L1

import * as tl from 'azure-pipelines-task-lib/task';
import { sendRequest, WebRequest, WebResponse } from './httpclient';
import * as path from 'path';

tl.setResourcePath(path.join(__dirname, 'task.json'));

function getGithubEndPointToken(githubEndpoint: string): string {
    const githubEndpointObject = tl.getEndpointAuthorization(githubEndpoint, false);
    let githubEndpointToken: string | undefined = undefined;

    if (!!githubEndpointObject) {
        tl.debug('Endpoint scheme: ' + githubEndpointObject.scheme);

        if (githubEndpointObject.scheme === 'PersonalAccessToken') {
            githubEndpointToken = githubEndpointObject.parameters.accessToken;
        } else if (githubEndpointObject.scheme === 'OAuth') {
            githubEndpointToken = githubEndpointObject.parameters.AccessToken;
        } else if (githubEndpointObject.scheme === 'Token') {
            githubEndpointToken = githubEndpointObject.parameters.AccessToken;
        } else if (githubEndpointObject.scheme) {
            console.log(githubEndpointObject.scheme);
            throw new Error('InvalidEndpointAuthScheme');
        }
    }

    if (!githubEndpointToken) {
        console.log(githubEndpoint)
        throw new Error('InvalidGitHubEndpoint');
    }

    return githubEndpointToken;
}

function findComments(repositoryName: string, id: string, comment: string, token: string) {
    const url = `https://api.github.com/repos/${repositoryName}/issues/${id}/comments`;
    const headers = {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
    };

    const request = new WebRequest();
    request.uri = url;
    request.headers = headers;
    request.method = 'GET';

    return sendRequest(request).then((response: WebResponse) => {
        if (response.statusCode !== 201) {
            tl.debug(JSON.stringify(response));
            throw new Error('WriteFailed');
        } else {
            console.log(JSON.stringify(response));
        }
    });
}

function run(): Promise<void> {
    const endpointId = tl.getInput('gitHubConnection', true);
    if (!endpointId) {
        throw new Error("Could not determine endpointId");
    }
    const token = getGithubEndPointToken(endpointId);

    const repositoryName = tl.getInput('repositoryName', true);
    if (!repositoryName) {
        throw new Error("Could not determine repositoryName");
    }

    if (!tl.getVariable('Build.SourceBranch') || tl.getVariable('Build.SourceBranch')!.startsWith('refs/pull/')) {
        throw new Error("Could not determine Build.SourceBranch");
    }
    const id = tl.getVariable('Build.SourceBranch')!.split('/')[2];


    const includesString = tl.getInput('includesString');
    if (!includesString) {
        throw new Error("Could not determine includesString");
    }

    if (!id) {
        console.log('NoOp');
        return Promise.resolve();
    }


    return findComments(repositoryName, id, token, includesString);
}

run()
    .then(() => tl.setResult(tl.TaskResult.Succeeded, ''))
    .catch((error: Error) => tl.setResult(tl.TaskResult.Failed, error.message));