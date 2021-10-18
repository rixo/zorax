

=> This is for zoar

Enables integration with cli runner by exposing the default harness, and an option to disable autorun.

~~~js
import { harness } from 'zorax'

harness.auto(false)

setTimeout(() => {
  harness.report(myFancyReporter)
})
~~~
