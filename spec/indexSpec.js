const specContext = require.context('.', true, /Spec\.js$/);
specContext.keys().forEach(specContext);
