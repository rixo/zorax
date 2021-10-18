# `zoar --watch`

~~~bash
# long --watch enables and add a watch target
zoar --watch [glob]

# short -w just enables watch (target.spec.js will be run, not watched)
zoar -w target.spec.js
~~~

Examples:

~~~bash
# watch and (re)run
zoar '*.spec.js' --watch
zoar -w '*.spec.js'

# watch with an additional watch target
# NOTE watch targets must be globs, not directory or file names
zoar '*.spec.js' --watch '../my-other-lib/**'

# watch and (re)print files
zoar '*.spec.js' --watch --ls

# watch and (re)print tests
zoar '*.spec.js' --watch --print
~~~

## Interactive

~~~
[Enter] rerun
rc      rerun
q       quit
~~~
