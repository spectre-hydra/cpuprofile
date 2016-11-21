# cpuprofile

A simple representation of .cpuprofile files.

## Installation

```
npm install --save cpuprofile
```

## Usage

```javascript
const Profile = require('cpuprofile').Profile;

// read and parse a .cpuprofile file
let content = require('fs').readFileSync('prof.cpuprofile', {encoding: 'utf8'});
let parsed = JSON.parse(content);

// create Profile
let profile = Profile.createFromObject(parsed);

// generate formatted overview on self and total times
let output = profile.formattedBottomUpProfile();
```

## Features

- `Profile` and `ProfileNode` classes.
- Generation of Bottom Up Profiling view of Chrome DevTools.

## Credits

- [Alexei Filippov](mailto:alph@chromium.org): Thanks for pointing me in the right direction!
- [Chromium](https://chromium.googlesource.com/): The calculation of self and total times is adapted from parts of the Chromium project.

## License

Copyright &copy; 2016 by Sebastian Ruhleder. Released under the MIT license.
