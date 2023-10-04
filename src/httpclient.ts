// https://github.com/microsoft/azure-pipelines-tasks/blob/88ec5139c28625ea228d3a40f662454cd2f5dd44/Tasks/GitHubCommentV0/httpclient.ts#L1

import * as tl from 'azure-pipelines-task-lib/task';
import * as httpClient from 'typed-rest-client/HttpClient';
import * as httpInterfaces from 'typed-rest-client/Interfaces';
import * as util from 'util';

const proxyUrl: string | undefined = tl.getVariable('agent.proxyurl');
const requestOptions: httpInterfaces.IRequestOptions = proxyUrl ? {
    proxy: {
        proxyUrl: proxyUrl,
        proxyUsername: tl.getVariable('agent.proxyusername'),
        proxyPassword: tl.getVariable('agent.proxypassword'),
        proxyBypassHosts: tl.getVariable('agent.proxybypasslist') ? JSON.parse(tl.getVariable('agent.proxybypasslist')!) : null
    }
} : {};

const ignoreSslErrors: string | undefined = tl.getVariable('VSTS_ARM_REST_IGNORE_SSL_ERRORS');
requestOptions.ignoreSslError = ignoreSslErrors && ignoreSslErrors.toLowerCase() === 'true' ? true : false;

const httpCallbackClient = new httpClient.HttpClient(tl.getVariable('AZURE_HTTP_USER_AGENT'), undefined, requestOptions);

export class WebRequest {
    public method: string = "GET";
    public uri: string = "";
    // body can be string or ReadableStream
    public body: string | NodeJS.ReadableStream = "";
    public headers: any;
}

export class WebResponse {
    public statusCode: number = 0;
    public statusMessage: string = "";
    public headers: any;
    public body: any;
}

export class WebRequestOptions {
    public retriableErrorCodes: string[] = [];
    public retryCount: number = 1;
    public retryIntervalInSeconds: number = 1000;
    public retriableStatusCodes: number[] = [];
    public retryRequestTimedout: boolean = false;
}

export async function sendRequest(request: WebRequest, options?: WebRequestOptions): Promise<WebResponse> {
    let i = 0;
    const retryCount = options && options.retryCount ? options.retryCount : 5;
    const retryIntervalInSeconds = options && options.retryIntervalInSeconds ? options.retryIntervalInSeconds : 2;
    const retriableErrorCodes = options && options.retriableErrorCodes ? options.retriableErrorCodes : ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EA_AGAIN'];
    const retriableStatusCodes = options && options.retriableStatusCodes ? options.retriableStatusCodes : [408, 409, 500, 502, 503, 504];
    let timeToWait: number = retryIntervalInSeconds;
    while (true) {
        try {
            const response: WebResponse = await sendRequestInternal(request);
            if (retriableStatusCodes.indexOf(response.statusCode) != -1 && ++i < retryCount) {
                tl.debug(util.format('Encountered a retriable status code: %s. Message: \'%s\'.', response.statusCode, response.statusMessage));
                await sleepFor(timeToWait);
                timeToWait = timeToWait * retryIntervalInSeconds + retryIntervalInSeconds;
                continue;
            }

            return response;
        } catch (error: any) {
            if (retriableErrorCodes.indexOf(error.code) != -1 && ++i < retryCount) {
                tl.debug(util.format('Encountered a retriable error:%s. Message: %s.', error.code, error.message));
                await sleepFor(timeToWait);
                timeToWait = timeToWait * retryIntervalInSeconds + retryIntervalInSeconds;
            } else {
                if (error.code) {
                    console.log('##vso[task.logissue type=error;code=' + error.code + ';]');
                }

                throw error;
            }
        }
    }
}

export function sleepFor(sleepDurationInSeconds: number): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, sleepDurationInSeconds * 1000);
    });
}

async function sendRequestInternal(request: WebRequest): Promise<WebResponse> {
    tl.debug(util.format('[%s]%s', request.method, request.uri));
    const response: httpClient.HttpClientResponse = await httpCallbackClient.request(request.method, request.uri, request.body, request.headers);
    return await toWebResponse(response);
}

async function toWebResponse(response: httpClient.HttpClientResponse): Promise<WebResponse> {
    const res = new WebResponse();
    if (response) {
        res.statusCode = response.message.statusCode!;
        res.statusMessage = response.message.statusMessage!;
        res.headers = response.message.headers;
        const body = await response.readBody();
        if (body) {
            try {
                res.body = JSON.parse(body);
            } catch (error) {
                tl.debug('Could not parse response: ' + JSON.stringify(error, null, 2));
                tl.debug('Response: ' + JSON.stringify(res.body));
                res.body = body;
            }
        }
    }

    return res;
}