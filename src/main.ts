import {
  setResult,
  getVariable,
  getInput,
  debug,
  setResourcePath,
  getEndpointAuthorization,
  TaskResult,
} from 'azure-pipelines-task-lib';
import got from 'got';

setResourcePath(new URL('task.json', import.meta.url).pathname);

function getGithubEndPointToken(githubEndpoint: string): string {
  const githubEndpointObject = getEndpointAuthorization(githubEndpoint, false);
  let githubEndpointToken: string | undefined = undefined;

  if (!!githubEndpointObject) {
    debug('Endpoint scheme: ' + githubEndpointObject.scheme);

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
  prId,
  token,
}: {
  repositoryName: string;
  prId: string;
  token: string;
}): Promise<Record<string, any>> => {
  const url = `https://api.github.com/repos/${repositoryName}/issues/${prId}/comments?per_page=100`;
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
  prId,
  token,
  comment,
}: {
  repositoryName: string;
  prId: string;
  token: string;
  comment: string;
}) => {
  const url = `https://api.github.com/repos/${repositoryName}/issues/${prId}/comments`;
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
  const endpointId = getInput('gitHubConnection', true);
  if (!endpointId) {
    throw new Error('Could not determine endpointId');
  }
  const token = getGithubEndPointToken(endpointId);

  const repositoryName = getVariable('Build.Repository.Name');
  if (!repositoryName) {
    throw new Error('Could not determine Build.Repository.Name');
  }

  if (!getVariable('Build.SourceBranch') || !getVariable('Build.SourceBranch')!.startsWith('refs/pull/')) {
    console.log('This doesnt look like its triggered from a PR, skipping add comment');
  } else {
    const prId = getVariable('Build.SourceBranch')!.split('/')[2]!;

    const commentToPost = getInput('comment');
    if (!commentToPost) {
      throw new Error('Could not determine comment');
    }

    const comments = await getComments({repositoryName, prId, token});
    const hasComment = comments.some((githubCommentEntry: any) => {
      const hasText = githubCommentEntry.body.includes(commentToPost);

      return hasText;
    });

    if (hasComment) {
      console.log('Comment already exists, skipping add comment');
    } else {
      console.log(`Wrote comment to ${repositoryName}/pull/${prId}`);
      await writeComment({repositoryName, prId, token, comment: commentToPost});
    }
  }

  return Promise.resolve();
};

run()
  .then(() => setResult(TaskResult.Succeeded, ''))
  .catch((error: Error) => setResult(TaskResult.Failed, error.message));
