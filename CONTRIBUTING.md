# GitHub Action - Ephemeral Create and Update
## Contributing

### Building
Install packages as normal
```
$ yarn install
```

Build with ncc to get a single executable js file:
```
$ yarn build
```

## WARNING: there must be a corresponding tag in kubernetes-clusters for a version-locked review env to work!
Incrementing the version uses (semantic versioning)[https://semver.org]
incrementing the version will push a new tag to the repository, unless you have main checked out
(to protect main from admins with direct push rights)
```sh
yarn prepatch # ex. v1.0.1 -> v1.0.2-0 use while working on a bugfix
yarn preminor # ex. v1.0.1 -> v1.1.0-0 use while working on a non-breaking feature
yarn premajor # ex. v1.0.1 -> v2.0.0-0 use while working on a breaking change
```

Currently, releasing to main is a manual task that requires a fetch and merge from main (or `git pull`),
incrementing the version, and pushing the tag to origin after merging your approved PR:
```sh
git checkout main
git pull
yarn version [--patch|minor|major]
git push origin <new-version>
```

