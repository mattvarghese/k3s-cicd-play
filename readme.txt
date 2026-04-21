
[k3s experiment]

# install docker 
    sudo apt update && sudo apt install -y docker.io docker-compose-v2
    sudo usermod -aG docker $USER
    # Log out and log back in for the group change to take effect
    # If logout and login doesn't solve issues, do
    newgrp docker

# install k3s
    curl -sfL https://get.k3s.io | sh -
    # Check status
    sudo kubectl get nodes

# Alternatively for K3s
        # 1. Download the installer script and save it as k3s_install.sh
        curl -sfL https://get.k3s.io -o k3s_install.sh

        # 2. Give yourself permission to execute it
        chmod +x k3s_install.sh

        # 3. Execute the local file
        # Note: K3s usually requires sudo to set up the systemd services
        sudo ./k3s_install.sh
        
        sudo kubectl get nodes


# By default, the "steering wheel" (kubeconfig) is owned by root. To avoid typing sudo every time you use a Kubernetes command, run this:
    # Create the local config directory
    mkdir -p ~/.kube

    # Copy the config to your user's home
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

    # Give your user ownership
    sudo chown $(id -u):$(id -g) ~/.kube/config
    
    # Set environment variable - do this in ~/.bashrc maybe
    export KUBECONFIG=~/.kube/config

    # Test it without sudo
    kubectl get pods -A


Now, I want to do this in stages.

1. create the minimal app - for this I want to do test driven development, and agentic coding using github copilot in visual studio. The app is 3 parts - maybe three containers? Frontend, backend, database. What should I use for database? What should I use for backend - what other than .NET is standard backend? Frontend should be TypeScript+React+tailwindcss. I want linting too. I am assuming this needs to be on a git repo? Can I have a single git repo with separate folders for frontend, backend, and database if database also needs folder for docker image?

2. Deploy basic app using k3s. Can I deploy it as 1 db instance, 2 backend instances, and 3 frontend instances?

3. Setup CI/CD, then enhance the app and see the changes go live?


# Structure plan:
    /my-shopping-app
      ├── /frontend      (React + Vite + Tailwind)
      ├── /backend       (Node + TS)
      ├── /database      (Init scripts + Dockerfile if customized)
      ├── /k8s           (Kubernetes YAML manifests)
      ├── .github/workflows (CI/CD pipelines)
      
# Checkout git repo
git clone https://github.com/mattvarghese/k3s-cicd-play.git

# Create folders
cd k3s-cicd-play/
mkdir backend frontend database k8s

# Create database
database/init.sql
docker-compose.yaml  # Top level - applies to all

# Run the database container and test it
docker compose up -d
# if that gives errors, do ($ newgrp docker) or log out and log back in
# Then test the SQL database
docker exec -it $(docker ps -qf "name=db") psql -U user -d shopping_db -c "SELECT * FROM shopping_items;"

# To bring down containers, do 
docker compose down -v 
# The -v option removes the volumes, so nothing persists


# Update node to 24
sudo npm install -g n
sudo n 24  # Or sudo n lts
# Reopen terminal after this

# Setup backend project with Fastify
cd backend/
npm init -y
npm install fastify @fastify/postgres pg
npm install -D typescript @types/node @types/pg tsx

# Create tsconfig.json
npx tsc --init
# Make tsconfig.json match
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",          // Required for Node 24 ESM
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}

# Update package.json, so type is module and not commonjs

# Install vitest for TDD
npm install -D vitest supertest @types/supertest

# Add backend/src/app.test.ts
# Update scripts in package.json to
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}

# Stub backend/src/app.ts which will allow test to compile, but fail
import Fastify from 'fastify';

export async function buildApp() {
  const app = Fastify();

  // We define the route, but we don't connect to DB 
  // and we return an empty object instead of an array.
  app.get('/api/items', async (request, reply) => {
    return { message: "Not implemented yet" }; 
  });

  return app;
}

# run "npm test" and watch it fail
# Add second test for POST action - it too fails

# Add .github/workflows/test.yml
# Pushing this to github caused
#  1. your token needed to be given workflow permissions
#  2. it failed as you're not committing package-lock.json
# So you had to update backend/.gitignore to remove package-lock.json
# And commit both files.

# One option to run the same tests as in github is to use "act"
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
List available jobs: act -l
Run push event workflows: act push
Run a specific job: act -j <job_id>
Dry run (syntax check): act -n
# However, we won't do this as act containers are super heavy
# instead, to run test, 
1. from root folder do
docker compose up -d db
2. from backend folder do
npm run test
3. from root folder bring down docker
docker compose down [-v]

# Now we need to add an index.ts file to actually start the app as a server
# Notice that the package.json already is setup to run dist/index.js
# Then we add a Dockerfile to backend/ to allow composing the backend into a container
# Finally, we update the docker-compose.yaml to have a section for backend

# Now we can do 
docker compose up --build
# And both db and backend containers go online
# We can test by
$ curl http://localhost:3000/api/items
[{"id":1,"username":"matt","item_name":"Gallon of Milk","quantity":1,"created_at":"2026-04-17T22:12:05.934Z"},{"id":2,"username":"matt","item_name":"Eggs","quantity":12,"created_at":"2026-04-17T22:12:05.934Z"}]
$ curl -X POST http://localhost:3000/api/items \
     -H "Content-Type: application/json" \
     -d '{"username": "matt", "item_name": "Sourdough Bread", "quantity": 2}'
{"id":3,"username":"matt","item_name":"Sourdough Bread","quantity":2,"created_at":"2026-04-17T22:17:40.608Z"}
$ curl http://localhost:3000/api/items
[{"id":1,"username":"matt","item_name":"Gallon of Milk","quantity":1,"created_at":"2026-04-17T22:12:05.934Z"},{"id":2,"username":"matt","item_name":"Eggs","quantity":12,"created_at":"2026-04-17T22:12:05.934Z"},{"id":3,"username":"matt","item_name":"Sourdough Bread","quantity":2,"created_at":"2026-04-17T22:17:40.608Z"}]

# Note: TO fix 
WARN[0000] Docker Compose is configured to build using Bake, but buildx isn't installed
# Do this
sudo apt install docker-buildx

# To see logs inside docker
docker compose logs backend
docker compose logs db

Add a backend/.dockerignore file so that build pass doesn't copy node_modules etc.
Then build again using
docker compose up --build -d

Create an account on hub.docker.com
You used gmail SSO and created mattvarghesedocker
Then, go to account settings > Personal access token, and create a token with read, write, delete
Then in the terminal, at the project root level do
$ docker login -u mattvarghesedocker
Use the token as your password

Then, to push your backend image to docker hub
$ docker tag k3s-cicd-play-backend mattvarghesedocker/k3s-cicd-play-backend:v1
$ docker push mattvarghesedocker/k3s-cicd-play-backend:v1


# Now, we're going to setup K3S
# Bring down the docker containers
docker compose down [-v]
# Check k3s Status
kubectl get pods -A
kubectl get nodes -A
# Create a k3s namespace for the app
# Note, there is a default namespace, but it is better to make separate ones
kubectl create namespace k3s-cicd-play
# Set up the docker "passport" for K3s
kubectl create secret docker-registry dockerhub-key \
  --namespace k3s-cicd-play \
  --docker-username=mattvarghesedocker \
  --docker-password=<YOUR_TOKEN> \
  --docker-email=none@example.org
# Note, this is actually only needed when using private docker repos
# NOTE: Email doesn't need to be real
# To see secrets
kubectl get secret dockerhub-key -n k3s-cicd-play -o yaml

# You can set the default namespace with
kubectl config set-context --current --namespace=k3s-cicd-play
# But it is better to be explicit
kubectl get namespaces #OR# kubectl get ns # lists namespaces

Now, create ~/k8s/db-deploy.yaml
To bring up your database properly, you need:
1. Initialization SQL - this needs to match database/init.sql
2. PersistentVolumeClaim (PVC): This tells k3s, "I need 1GB of space on the hard drive that stays put even if the database crashes."
3. Deployment (or StatefulSet): This is the actual PostgreSQL container.
4. Service: This gives the database a fixed name (shopping-db) so the backend can find it.

Next, create ~/k8s/backend-deploy.yaml
The file has two parts. One for the pods. The other is the service, so 
it has a name, and frontend doesn't need to use changing IPs to access backend
And type: NodePort allows exposing a localhost port in the 30000+ range
whereas type: ClusterIP only allows a cluster IP address

Then, get this all running by
# 1. Start the database
kubectl apply -f k8s/db-deploy.yaml --namespace k3s-cicd-play
# 2. Wait for the DB Pod to reach 'Running'
kubectl get pods -n k3s-cicd-play
# 3. Start the backend
kubectl apply -f k8s/backend-deploy.yaml --namespace k3s-cicd-play

Example:
$ kubectl apply -f k8s/db-deploy.yaml --namespace k3s-cicd-play
persistentvolumeclaim/postgres-pvc created
deployment.apps/shopping-db created
service/shopping-db created
$ kubectl get pods -n k3s-cicd-play
NAME                          READY   STATUS              RESTARTS   AGE
shopping-db-fc459c7bf-qkm75   0/1     ContainerCreating   0          14s
$ kubectl apply -f k8s/backend-deploy.yaml --namespace k3s-cicd-play
deployment.apps/shopping-backend created
service/backend-service created
$ kubectl get pods -n k3s-cicd-play
NAME                                READY   STATUS    RESTARTS   AGE
shopping-backend-7fdc7fd4c7-q2z79   1/1     Running   0          2m28s
shopping-db-fc459c7bf-qkm75         1/1     Running   0          3m3s

You can change the number of backends by changing the replicas: 1 line to 2 and
kubectl apply -f k8s/backend-deploy.yaml -n k3s-cicd-play
Or to manually scale
kubectl scale deployment shopping-backend --replicas=2 -n k3s-cicd-play

$ curl -X POST http://localhost:30000/api/items \
       -H "Content-Type: application/json" \
       -d '{"username": "matt", "item_name": "Sourdough Bread", "quantity": 2}'
{"id":3,"username":"matt","item_name":"Sourdough Bread","quantity":2,"created_at":"2026-04-18T01:04:20.224Z"}

$ curl http://localhost:30000/api/items
[{"id":1,"username":"matt","item_name":"Gallon of Milk","quantity":1,"created_at":"2026-04-18T01:03:13.233Z"},{"id":2,"username":"matt","item_name":"Eggs","quantity":12,"created_at":"2026-04-18T01:03:13.233Z"},{"id":3,"username":"matt","item_name":"Sourdough Bread","quantity":2,"created_at":"2026-04-18T01:04:20.224Z"}]

# To get more info about pods
kubectl get pods -n k3s-cicd-play
kubectl describe pod <pod-name> -n k3s-cicd-play
kubectl describe pod shopping-backend -n k3s-cicd-play


Lens for observability  (Don't do this - prefer freelens below)
Go to https://lenshq.io/ and download Lens
Steps:  (as of 2026 04 18)
Install Lens K8S IDE from the APT repository#
Get the Lens K8S IDE public security key and add it to your keyring:
    $ curl -fsSL https://downloads.k8slens.dev/keys/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/lens-archive-keyring.gpg > /dev/null
Add the Lens K8S IDE repo to your /etc/apt/sources.list.d directory:
    $ echo "deb [arch=amd64 signed-by=/usr/share/keyrings/lens-archive-keyring.gpg] https://downloads.k8slens.dev/apt/debian stable main" | sudo tee /etc/apt/sources.list.d/lens.list > /dev/null
Info
Install or update Lens K8S IDE:
    $ sudo apt update && sudo apt install lens
Run Lens K8S IDE:
    $ lens-desktop

Freelens - this one doesn't need an account
https://flathub.org/en/apps/app.freelens.Freelens
You can 
flatpak install flathub app.freelens.Freelens
Since we already copied k3s config to ~/.kube/config,
freelens's default flatpak permissions allows it access
Connect to the default cluster, and go to workloads > Pods
Select your namespace, or all namespaces from filter
Then click one of the backend pods, and click terminal icon in sidebar
you're logged into the pod
Similarly for the db pod
Once inside db pod
$ psql -U postgres -d shopping_list
This starts postgresql
  \dt - shows tables
  \q - quit
  select * from shopping_list; - note: sql can be multiline. ';' terminates
  INSERT INTO shopping_items (username, item_name, quantity) VALUES ('matt', 'Cheese', 1);

Then in Freelens > default cluster > Cluster tab, it says
Metrics are not available due to missing or invalid Prometheus configuration
And below that there is an "Open cluster settings" link
Click the link
One of the Options is Prometheus Operator. 
But to install it, we first need to install "helm"
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
    chmod 700 get_helm.sh
    ./get_helm.sh
Then Prometheus
    # Add the repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    # Install the stack into its own namespace
    helm install prometheus prometheus-community/kube-prometheus-stack \
      --namespace monitoring \
      --create-namespace \
      --timeout 15m
    To undo (if you need to undo and redo)
    # Uninstall the broken release
    helm uninstall prometheus -n monitoring
    # (Optional) Delete the namespace to ensure a fresh start
    kubectl delete namespace monitoring
    If you get DNS resolution issues which cause things to not work, undo, fix dns, redo
Fixing DNS
    resolvectl status  # Shows current DNS resolution options
    sudoedit /etc/systemd/resolved.conf
    # Uncomment / set these two
        DNS=8.8.8.8 1.1.1.1
        FallbackDNS=9.9.9.9
    sudo systemctl restart systemd-resolved


For whatever reason, if you restart the computer and reopen freelens
IT again shows Metrics are not available due to missing or invalid Prometheus configuration
To fix you had to reinstall Promethus
    # Uninstall the broken release
    helm uninstall prometheus -n monitoring
    # (Optional) Delete the namespace to ensure a fresh start
    kubectl delete namespace monitoring
    helm install prometheus prometheus-community/kube-prometheus-stack \
      --namespace monitoring \
      --create-namespace \
      --timeout 15m
Note: Issue seems to be this Freelens bug: https://github.com/freelensapp/freelens/issues/1524


Now onto frontend:
cd frontend/
npm create vite@latest . -- --template react-ts
When it asks "Install with npm and start now?" say yes
CTRL-D to exit out (or you could keep it running)

If you're using VSCode, make sure to install the Tailwind CSS extension
- Tailwind CSS Intellisense: bradlc.vscode-tailwindcss
I also like to at least have this in the VSCode settings.json
(CTRL+SHIFT+P, search for User Settings (JSON))
        {
            "npm.packageManager": "npm",
            "npm.scriptRunner": "npm",
            "editor.wordWrap": "on",
            "editor.wrappingIndent": "indent",
            "editor.folding": true,
            "editor.showFoldingControls": "always",
            "editor.formatOnSave": true,
            "telemetry.editStats.enabled": false,
            "telemetry.feedback.enabled": false,
            "extensions.ignoreRecommendations": true,
        }

Install tailwind CSS using these steps:
https://tailwindcss.com/docs/installation/using-vite

npm install tailwindcss @tailwindcss/vite

Update vite.config.ts to
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import tailwindcss from '@tailwindcss/vite'

    export default defineConfig({
      plugins: [
        react(),
        tailwindcss(),
      ],
      server: {
        port: 3000, // Keep it consistent for your CORS settings
      }
    })

Delete src/App.css 
Change src/index.css to just be
    @import "tailwindcss";

Change src/frontend/App.tsx to code to show and add items (no delete yet)

You can also delete 
- files public/ except favicon (unless you replace favicon with your own)
- src/assets folder

We now try to run this
# in the root folder, bring up the database
docker compose up db -d
# In the backend folder, bring up backend
npm run dev
curl http://localhost:3000/api/items # should return initial items
# In frontend folder
npm run dev
# Then navigate to http://localhost:3001 or whatever address shown

You will see items not loading due to CORS. 
To fix this, stop the backend, and in the backend folder
npm install @fastify/cors

Then in backend/src/app.ts, add this import
import cors from '@fastify/cors';

and add this code just after app is defined
  // 1. Regular CORS registration
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true); // Allow non-browser requests (like curl or postman)
        return;
      }

      try {
        const { hostname } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          cb(null, true);
        } else {
          cb(new Error("CORS: Origin not allowed"), false);
        }
      } catch {
        cb(new Error("CORS: Invalid Origin"), false);
      }
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

Now, everything works locally. Next, we must containerize the frontend and deploy on K3S
We add the following files in frontend
- Dockerfile
- .dockerignore
- nginx.conf    - this is necessary to forward API requests to backend (what vite does for npm run dev)
Then add frontend section under services in root docker-compose.yaml
  frontend:
    build: ./frontend
    restart: always
    ports:
      - "3001:80" # Maps Nginx port 80 to your familiar 3001
    depends_on:
      - backend

Now to run this via local docker, in the root folder
1. bring down the db instance
docker compose down [-v]
2. Bring up everything forcing build
docker compose up --build -d
3. Navigate to http://localhost:3001 and see it working


SIDE note, to see logs
$ docker compose logs -f <service-name>


However, we have a problem. The nginx.conf forwards to http://backend:3000
Which only works when we do
docker compose up --build -d
It won't work with k3s, as the cluster has backend at http://backend-service:80

To fix this, we're going to change k3s to use http://backend-service:3000
and nginx.conf also to use: http://backend-service:80
First, Update nginx.conf to use http://backend-service:80
Then, update this line in backend-deploy.yaml to use port 3000
      port: 80         # Internal cluster port

Now, since we updated the backend's docker image, we need to push it to docker hub
We will tag it as v2
    docker tag k3s-cicd-play-backend mattvarghesedocker/k3s-cicd-play-backend:v2
    docker push mattvarghesedocker/k3s-cicd-play-backend:v2
Note, we're not asked for password again, as we did docker login

Now we need to redeploy k3s with the new v2 image
Update this line in k8s/backend-deploy.yaml
    image: mattvarghesedocker/k3s-cicd-play-backend:v2   # was v1, changed to v2

Then redeploy with
$ kubectl apply -f k8s/backend-deploy.yaml --namespace k3s-cicd-play

SO now, the final step is to tag and push the frontend docker image, make k8s/frontend-deploy.yaml and deploy it?
    # If image was already built
    docker tag k3s-cicd-play-frontend mattvarghesedocker/k3s-cicd-play-frontend:v1
    OR
    # Build the image locally (using the Dockerfile we made earlier)
    docker build -t mattvarghesedocker/k3s-cicd-play-frontend:v1 ./frontend

    # Push to Docker Hub
    docker push mattvarghesedocker/k3s-cicd-play-frontend:v1
    
Create frontend-deploy.yaml and then apply it
$ kubectl apply -f k8s/frontend-deploy.yaml --namespace k3s-cicd-play

Now, navigate to http://localhost:30001 to see the app

When the app requests http://localhost:30001/api/items,
it first hits frontend-deploy.yaml's frontend-service which forwards it to self's target port 80
Self's target port 80 is handled by nginx with config frontend/nginx.conf
which forwards the request to http://backend-service:3000
http://backend-service:3000 is defined in backend-deploy.yam
in backend-service, where we changed port from port:80 to port:3000

=============================================================================
NOW we haave an app which allows us to add items, but not delete them
=============================================================================

To bring down the k3s deployment
# Bring down the frontend (pods, deployment, and service)
kubectl delete -f k8s/frontend-deploy.yaml -n k3s-cicd-play
# Bring down the backend (pods, deployment, and service)
kubectl delete -f k8s/backend-deploy.yaml -n k3s-cicd-play
# Bring down the database (configmap, deployment, service, and PVC)
kubectl delete -f k8s/db-deploy.yaml -n k3s-cicd-play

Or alternatively, to bring down all
kubectl delete -f k8s/ -n k3s-cicd-play

=============================================================================
Now, we'll add delete item capability
=============================================================================

Now we should add a delete button
For this, first, we should add the DELETE route in backend/app.ts
  // 5. The DELETE Route: Remove an item by ID
  app.delete('/api/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const query = 'DELETE FROM shopping_items WHERE id = $1 RETURNING id';

    try {
      const { rows } = await app.pg.query(query, [id]);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Item not found' });
      }

      return { message: 'Item deleted successfully', id: rows[0].id };
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete item' });
    }
  });

Also add tests for delete, and push to github

Test local docker
    docker compose up -d --build
    # Go to http://localhost:3001 and add item so there is item 3
    curl -X DELETE http://localhost:3000/api/items/3
    # refresh browser to see item 3 deleted

Now that we have a new backend, we tag it as v3, push to docker hub, and redeploy
    docker build -t mattvarghesedocker/k3s-cicd-play-backend:v3 ./backend
    docker push mattvarghesedocker/k3s-cicd-play-backend:v3
    # Make sure k8s/backend-deploy.yaml is updated to reference v3
    kubectl apply -f k8s/backend-deploy.yaml -n k3s-cicd-play

Now similarly as with docker we can add item and delete it with the k3s deployment
    # Go to http://localhost:30001 and add item so there is item 3
    curl -X DELETE http://localhost:30000/api/items/3
    # refresh browser to see item 3 deleted

Next, update the frontend/src/App.tsx to support deletion
Then test locally
    docker compose down -v   # Bring any running docker instances down
    docker compose up db -d
Then in both frontend/ and backend/ run npm run dev
go to http://localhost:3001 and verify that you can now add and delete

Then test using docker
    docker compose down -v
    docker compose up -d --build
go to http://localhost:3001 and verify that you can now add and delete

Now, tag and push frontend docker image as v2
    docker build -t mattvarghesedocker/k3s-cicd-play-frontend:v2 ./frontend
    docker push mattvarghesedocker/k3s-cicd-play-frontend:v2

Update k8s/frontend-deploy.yaml to use v2 of frontend, and deploy
    kubectl apply -f k8s/frontend-deploy.yaml -n k3s-cicd-play
    
One other note, we can have tags be part of the docker-compose.yaml 
Updated codebase to do that as well

=============================================================================
Now we're all done - we won't bother with edit item, as you can delete and add
=============================================================================


=============================================================================
Phase 2: switching to kubernetes using Kustomize and consolidating database init.sql etc
=============================================================================

Side note. We used shopping_db for local and docker, but shopping_list for k3s database name
    $ grep -r "shopping_list" *
    k8s/backend-deploy.yaml:              # We use the Service Name (shopping-db) and the Cluster DB Name (shopping_list)
    k8s/backend-deploy.yaml:              value: "postgres://postgres:password@shopping-db:5432/shopping_list"
    k8s/db-deploy.yaml:              value: "shopping_list"
    readme.txt:$ psql -U postgres -d shopping_list
    readme.txt:  select * from shopping_list; - note: sql can be multiline. ';' terminates
Fix this, so everything is shopping_db throughout

Then, remove the "Configure" section containing SQL from db-deploy.yaml

Then add a kustomization.yaml at the root folder
K3s can be run in two ways 
    kubectl apply -f k8s/ -n k3s-cicd-play
    This runs individual deployment yaml files from k8s folder
OR
    kubectl apply -k .
    This runs the root kustomization.yaml - note that this specifies namespace and resources

And in the kustomize framework, you can bring down the k3s deployment with
    kubectl delete -k .



=============================================================================
Phase 3: users and authentication with keycloak
=============================================================================

Keycloak is an opensource Identity Management provider which we can run in a
docker container, and have it connect to our same backend database.
The frontend will redirect to keycloak for user signup / user signin.
It will then get an access token and a refresh token which it will use to
authorize backend requests. Backend will verify signature of token with keycloak.

At the bottom of database/init.sql, add a line to create keycloak_db
The shopping_db database is created through either the docker-compose.yaml or the
db-deploy.yaml. However, we must explicitly create the keycloak_db

Add keycloak section to the docker-compose.yaml under services
Add health check to database also
Make backend check health of db and keycloak
Add keycloak related environment variables to the backend-service

At this point we can run
    docker compose down -v   # bring down any running containers, cleanup volumes
    docker compose up -d --build

Navigate to http://localhost:8080/health/ready to check health
Navigate to http://localhost:8080/ and log in as admin/admin to configure

NOTE: Keycloak takes about 40seconds to boot

[-- git commit -m "Keycloak added to docker-compose.yaml" --]

Within the keycloak command center (localhost:8080 admin/admin)
1. Create the Realm
A Realm is an isolated silo for your users and applications.
    In the top-left corner, click the dropdown that says Master and click Create Realm.
    Realm name: shopping-realm (matches your KEYCLOAK_ISSUER_URL).
    Click Create.
2. Create the Client (for your App)
The "Client" is the configuration that allows your Frontend and Backend to talk to Keycloak.
    On the left sidebar, click Clients.
    Click Create client.
    Client type: OpenID Connect.
    Client ID: shopping-app.
    Click Next.
    Capability config:
        Ensure Standard flow is checked (this is for the browser login).
        Leave Client authentication OFF
    Click Next.
3. Configure Redirect URIs
This is a security feature that prevents hackers from stealing your tokens.
    Root URL: http://localhost:3001 (Your Frontend).
    Valid redirect URIs: http://localhost:3001/* and http://localhost:30001/*
    Web origins: + (This allows CORS from your Root URL).
    Click Save.
4. Create a Test User
You can't log in with the admin user into your app; you need a "customer."
    On the left sidebar, click Users.
    Click Add user.
    Username: tester.
    Click Create.
    Go to the Credentials tab within the User view.
    Click Set password.
        Password: password123
        Temporary: OFF (So you don't have to change it on first login).
    Click Save.
5. Allow user registration
    Go to realm settings for realm shopping-realm
    Go to Login tab, and toggle user registration to true / on

If you want to verify everything is working before we touch the code, open a new browser tab and visit:
http://localhost:8080/realms/shopping-realm/.well-known/openid-configuration
If you see a wall of JSON, your realm is live and correctly serving its metadata.

Now, this config would go away when we do docker compose down. 
To make this persistent, we must export your current work
    In Keycloak UI, go to Realm Settings (top right Action menu).
    Click Partial Export.
    Toggle "Include clients" and "Include users" to ON.
    Click Export and save it as shopping-realm.json.
Move this shopping-realm.json file to a new path <root>/keycloak/import/
Note that the tester user is not included in the export. So add this (just after roles and groups)
"users": [
    {
      "username": "tester",
      "enabled": true,
      "emailVerified": true,
      "firstName": "Test",
      "lastName": "User",
      "credentials": [
        {
          "type": "password",
          "value": "password123",
          "temporary": false
        }
      ],
      "realmRoles": [
        "default-roles-shopping-realm"
      ],
      "clientRoles": {
        "realm-management": [
          "view-users"
        ]
      }
    }
  ],
  # For a real production deployment, you wouldn't do this
  
Now update your docker-compose.yaml keycloak section with these two changes
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command: start-dev --import-realm # <--- Added this flag
    environment:
      # ... your existing env vars ...
    volumes:
      - ./keycloak/import:/opt/keycloak/data/import # <--- Added this volume
    # ... healthchecks ...

Now, do 
  docker compose down -v
  docker compose up -d --build

log into http://localhost:8080 and verify that
  our realm exists
  our user exists
  our client exists and has the right secret
look at
  docker compose logs keycloak
look for
    KC-SERVICES0050: Initializing master realm
    KC-SERVICES0030: Imported realm shopping-realm from file /opt/keycloak/data/import/shopping-realm.json
    KC-SERVICES0009: Added user 'admin' to realm 'master'

Navigate to http://localhost:8080/realms/shopping-realm/account
   Login as tester/password123

NOTE: Given we modified the backend-service in docker-compose, updated its tag to v4
Haven't pushed it yet, as we may have more changes.

[-- git commit -m "Keycloak configuration" --]

Now that we have keycloak container sorted out, we need to update our backend.
Inside the backend folder, do 
    npm install @fastify/jwt
    npm install jwks-rsa

In backend/src/app.ts, add authenticate decorator
  // 2. The Auth Guard (Decorator)
  app.decorate("authenticate", async (request: any, reply: any) => {
    ...
  });
Use it in the APIs 
Update tests to work around not having authentication

NOTE: realized that Gemini was intending SPA directly talking to Keycloak
so client secret is not an option. Changed to public client, and removed secrets


[-- git commit -m "Backednd wrap up" --]


For frontend, do this in the frontend folder
    npm install keycloak-js
Then add the files
    backend/.env
    frontend/public/silent-check-sso.html
    frontend/src/components/UserStatus.tsx
    frontend/src/context/AuthContext.tsx
    frontend/hooks/useApi.ts
    Update App.tsx and main.tsx

Now to run from npm
    docker compose up -d db keycloak
Then in both backend/ and frontend/ folders
    npm run dev
You can login as tester/password123, or create new user

To run all from docker
    Bring down the npm and docker runs
    then do
    docker compose up -d --build
You can again login as tester/passwor123, or create new user
    If you didn't bring down with -v, your previous changes will persist


[-- git commit -m "Frontend working on npm+db+keycloak and docker-all" --]


To run in k3s, add the k8s/keycloak-deploy.yaml file and plug it into kustomization.yaml
Then, we updated docker-compose.yaml to have v4 for backend and v3 for frontend
(Updated to v4 and v5, as kubectl won't pull if it already pulled)
But we didn't push these. Push them now
    docker build -t mattvarghesedocker/k3s-cicd-play-frontend:v4 ./frontend
    docker push mattvarghesedocker/k3s-cicd-play-frontend:v4

    docker build -t mattvarghesedocker/k3s-cicd-play-backend:v5 ./backend
    docker push mattvarghesedocker/k3s-cicd-play-backend:v5

Update k8s/frontend-deploy.yaml to use frontend:v4
Update k8s/backend-deploy.yaml to use backend:v5

Then, 
    kubectl apply -k .
To monitor the keycloak deployment for errors:
    kubectl logs -f deployment/keycloak -n k3s-cicd-play
The above will say 
    2026-04-20 22:26:25,750 INFO  [org.keycloak.services.resources.KeycloakApplication] (pool-6-thread-1) Bootstrap completed in 31.061000 seconds
When the keycloak container is live

To look at backend logs:
    # -l app=shopping-backend: Targets all pods with that label
    # -f: "Follow" (streams logs in real-time)
    # --prefix: Shows you which pod the log came from (crucial with replicas)
    kubectl logs -n k3s-cicd-play -l app=shopping-backend -f --prefix
    
To bring down
    kubectl delete -k .

At this point, everything works in all modes: 
1. db,keycloak on docker; frontend,backend on npm run dev:: localhost:3001
2. docker compose up -d --build (everything on docker):: localhost:3001
3. kubectl apply -k . (everything on k3s):: localhost:30001


[-- git commit -m "Everything works in npm run dev, docker, and k3s" --]

  