import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';
import got from 'got';

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
    console.log(githubEndpoint);
    throw new Error('InvalidGitHubEndpoint');
  }

  return githubEndpointToken;
}

const getComments = async ({
  repositoryName,
  id,
  token,
}: {
  repositoryName: string;
  id: string;
  token: string;
}): Promise<Record<string, any>> => {
  const url = `https://api.github.com/repos/${repositoryName}/issues/${id}/comments`;
  const options = {
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    return await got(url, options).json();
  } catch (error) {
    throw new Error(`Fetching comments failed ${error}`);
  }
};

const writeComment = async ({
  repositoryName,
  id,
  token,
  comment,
}: {
  repositoryName: string;
  id: string;
  token: string;
  comment: string;
}) => {
  const url = `https://api.github.com/repos/${repositoryName}/issues/${id}/comments`;
  const options = {
    json: {
      body: comment,
    },
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    await got.post(url, options);
  } catch (error) {
    throw new Error(`Writing comment failed ${error}`);
  }
};

const run = async (): Promise<void> => {
  const endpointId = tl.getInput('gitHubConnection', true);
  if (!endpointId) {
    throw new Error('Could not determine endpointId');
  }
  const token = getGithubEndPointToken(endpointId);

  const repositoryName = tl.getVariable('Build.Repository.Name');
  if (!repositoryName) {
    throw new Error('Could not determine Build.Repository.Name');
  }

  if (!tl.getVariable('Build.SourceBranch') && !tl.getVariable('Build.SourceBranch')!.startsWith('refs/pull/')) {
    throw new Error('Could not determine Build.SourceBranch');
  }
  const id = tl.getVariable('Build.SourceBranch')!.split('/')[2]!;

  const commentToPost = tl.getInput('comment');
  if (!commentToPost) {
    throw new Error('Could not determine comment');
  }

  const comments = await getComments({repositoryName, id, token});
  const hasComment = comments.some((githubCommentEntry: any) => {
    const hasText = githubCommentEntry.body.includes(commentToPost);

    return hasText;
  });

  if (hasComment) {
    console.log('Comment already exists, skipping add comment');
  } else {
    await writeComment({repositoryName, id, token, comment: commentToPost});
  }

  return Promise.resolve();
};

run()
  .then(() => tl.setResult(tl.TaskResult.Succeeded, ''))
  .catch((error: Error) => tl.setResult(tl.TaskResult.Failed, error.message));
