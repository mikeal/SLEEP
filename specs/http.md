## HTTP endpoint

Can be any URL, and is a GET request.

There are some extra URL parameters that a client can include:

* since - seq id to start at, returns everything after that, defaults to the start
* limit - maximum number of changes to return, defaults to unlimited XXX can a server optionally limit this to a maximum?
* include\_data - if present and false, the wire protocol's data field isn't included

