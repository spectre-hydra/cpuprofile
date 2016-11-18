# cpuprofile

Extends the JSON object of a parsed `.cpuprofile` file with its sampling interval and each node of the profile with its self and total execution time.

## Installation

```
npm install --save cpuprofile
```

## Usage

```javascript
var cpuprofile = require('cpuprofile');

// read a .cpuprofile file
var content = require('fs').readFileSync('prof.cpuprofile', {encoding: 'utf8'});
var profile = JSON.parse(content);

// calculate sampling interval, and self and total times for each node
cpuprofile.calculateTimes(profile);

// accumulates and outputs the self and total times of the functions present in the profile
var overview = cpuprofile.format(profile);
```

## License

Copyright &copy; 2016 by Sebastian Ruhleder. Released under the MIT license.
