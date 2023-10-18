# ghacinx - GitHub Add Comment If Not eXist

This task will add a comment to a GitHub PR only if the comment does not already exist. This is useful for automated checks that runs on every commit, to reduce noise in the PR.

It also supports markdown comments.

## Limitations

Only the 100 first comments will be checked if the comment already extists.

## Configuration

This task requires that a GitHub service connection is configured for the project. (Project Settings -> New Service Connection -> GitHub).

The repo and issue will be automatically resolved. If the task is running outside a GitHub PR context, it will not do anything.

Example configuration:

```yaml
- task: GitHubAddCommentIfNotExist@0
  inputs:
    gitHubConnection: GitHubSC # Name of GitHub Service Connection
    comment: |
      <!--- Some markdown comment --->
      This comment will only be added once to the PR
```
