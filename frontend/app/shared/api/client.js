function buildLoadError(resourceName, detail) {
  const suffix = detail ? ` ${detail}` : "";
  return `Couldn't load ${resourceName}.${suffix} Make sure the backend is running and the database has been seeded.`;
}

async function fetchJSON(url, resourceName, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      ...(options || {}),
    });
  } catch (_error) {
    throw new Error(buildLoadError(resourceName, "The server couldn't be reached."));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error ? `Server said: ${data.error}.` : `Server returned ${response.status}.`;
    throw new Error(buildLoadError(resourceName, detail));
  }

  return data;
}

export {
  buildLoadError,
  fetchJSON,
};
