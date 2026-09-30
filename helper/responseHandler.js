function responseHandler(res, status, data, type="json", headers=null) {
  res.status(status);
  
  if (headers) {
    res.set(headers);
  }

  switch(type) {
    case "json":
      return res.json(data);
    case "text":
      return res.type("text/plain").send(data);
    case "image":
      return res.type("image/png").send(data);
    default:
      return res.status(500).json({
        error: "Unsupported response type."
      });
  }
}

module.exports = responseHandler;