# Wire protocol

#### Language

Each log will be referred to as an *entry*.

The actor exposing the interface to be read by this wire protocol will be referred to as *server*. The actor reading the wire protocol will be referred to as the *client*.

A *server* can expose this wire protocol at any number of *endpoints*. The scope of those endpoints is not defined by this spec but examples are: a database, an index.

```JSON
{ "seq": 10,
  "id": "07acde3002cb1f62a08de5469160b912",
  "deleted": false,
  "data": { "first_name": "Ryan", "last_name": "Pitts", "employer": "The Spokesman-Review" }
}
```

## Request

### Options

* since - seq id to start at, returns everything after that, defaults to the start
* limit - maximum number of changes to return, defaults to unlimited XXX can a server optionally limit this to a maximum?
* include\_data - if present and false, the wire protocol's data field isn't included
* style - optional. the feed encoding style, either newline or array. defaults to array.
* seq - optional. the separator to use if style=newline, defaults to `\r\n`

## Response

### Feed Types

### Entries

#### seq

Every *entry* MUST include a **seq** property.

Each *entry* MUST be returned in the order defined by its **seq**.

The *entries* MAY be "sparse" and clients MUST NOT assume every sequential integer will be returned or that *entries* will begin at any particular integer.

The value of **seq** MUST be a JSON integer type.

#### id

Every *entry* MUST include an **id** property.

Every **id** MUST be a unique identifier per *endpoint*.

An **id** MAY occure more than once during transmission. Clients MUST assume that the higher **seq** that is returned for an **id** replaces the previous *entry*.

The value of **id** MUST be a JSON string type.

#### deleted

Each *entry* MAY include a **deleted** property.

If ommitted clients MUST assume this property is `false`.

The value of **deleted** MUST be a JSON boolean type.

#### data

Each *entry* MAY include a **data** property.

If omitted clients MUST NOT assume this property does not exist as it may be suppresed by certain *endpoint* options.

Even when the **data** property is explicitely included by a *client* request to an *endpoint* clients MUST NOT assume the property will exist when **deleted** is `true`.

# Data format

Optional - by convention name variables storing WGS 84 latitude/longitude so
they end \_lat and \_lng. e.g. `"data": { "city": "Liverpool", "centre_lat": 53.4, "centre_lng": -3 }`


