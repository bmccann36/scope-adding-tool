var fs = require('fs');
var path = require('path');
const AWS = require('aws-sdk');
const { magenta } = require('chalk')

const apigateway = new AWS.APIGateway({ region: 'us-east-1' });

const apiId = 'mep5tz8x2m'
const stage = 'test'
const scopes = ['email']
addScopes(apiId, stage, scopes)

async function addScopes(apiId, stage, scopes) {
  try {
    cleanFolder()
    const oldDef = await fetchDefinition(apiId, stage)
    fs.writeFileSync('definitions/old.json', oldDef)
    let newDef = Object.assign({}, JSON.parse(oldDef))
    const { paths } = newDef
    for (let path in paths) {
      let pathObject = paths[path].get.security[0]
      pathObject.authorizer = scopes
    }
    fs.writeFileSync('definitions/new.json', JSON.stringify(newDef, null, 4))
    await updateDefinition(apiId, newDef)
    await deployChanges(apiId)
  } catch (err) {
    console.error(err)
  }

}

function cleanFolder() {
  const defs = (path.join(__dirname, '/definitions'))
  const files = fs.readdirSync(defs)
  if (files) {
    files.forEach(file => {
      fs.unlinkSync(defs + '/' + file)
    })
    console.log(magenta('deleted old definitions'))
  }
}

function fetchDefinition(apiId, stage) {
  var params = {
    exportType: 'swagger',
    restApiId: apiId,
    stageName: stage,
    accepts: 'application/json',
    parameters: {
      'extensions': 'authorizers, integrations'
    }
  };
  return apigateway.getExport(params).promise()
    .then(data => {
      console.log(magenta('retrieved existing definition'))
      return data.body
    })
    .catch(err => err)
}

function updateDefinition(apiId, def) {
  var params = {
    body: JSON.stringify(def),
    restApiId: apiId,
    failOnWarnings: true,
    mode: 'merge'
  };
  return apigateway.putRestApi(params).promise()
    .then(res => {
      console.log(magenta('updated definitions with definitions/new.json'))
      console.log(res)
    })
    .catch(err => console.log(err))
}

function deployChanges(apiId) {
  var params = {
    restApiId: apiId,
    description: 'adding in scope',
    stageName: 'test'
  };
  return apigateway.createDeployment(params).promise()
    .then(res => {
      console.log(magenta('deployment complete'))
      console.log(res)
    })
    .catch(err => err)
}



