# Déploiement du front admin (admin.stssarl.com)

Le front est déployé automatiquement par GitHub Actions à chaque push sur `main`.
Plus besoin de construire en local ni d'envoyer le `dist/` à la main.

```text
push sur main ──▶ GitHub Actions ──▶ pnpm build ──▶ rsync (SSH) ──▶ ~/infra/nginx/www/sts-admin ──▶ nginx
```

Le workflow se trouve dans [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

---

## 1. Fonctionnement

Le workflow comporte deux jobs.

**Build**
1. Installe les dépendances avec `pnpm install --frozen-lockfile`.
2. Construit l'application avec `pnpm build`.
3. Conserve le dossier `dist/` comme artefact pendant 7 jours.

**Déploiement**
1. Vérifie que `DEPLOY_PATH` se termine par `sts-admin`. Ce garde-fou empêche un `rsync --delete` d'effacer un autre dossier du serveur.
2. Envoie d'abord les nouveaux fichiers de `assets/`, puis `index.html`. Le site ne sert jamais un `index.html` qui pointe vers des fichiers encore absents.
3. Conserve les anciens fichiers de `assets/` pendant 7 jours. Un onglet resté ouvert sur l'ancienne version continue de fonctionner.
4. Vérifie que `https://admin.stssarl.com` sert bien le nouveau build. Si ce n'est pas le cas, le workflow échoue.

nginx sert directement les fichiers du dossier : aucun redémarrage n'est nécessaire.

---

## 2. Configuration initiale (une seule fois)

### 2.1 Sur le serveur

```bash
# rsync est nécessaire pour l'envoi des fichiers
sudo apt install -y rsync

# Chemin absolu du dossier servi par nginx, à reporter dans le secret DEPLOY_PATH
realpath ~/infra/nginx/www/sts-admin
```

Le dossier `~/infra/nginx/www/sts-admin` du serveur correspond à `/usr/share/nginx/html/sts-admin` dans le conteneur nginx.

### 2.2 Clé SSH de déploiement

Vous pouvez réutiliser la clé du déploiement backend, ou en créer une dédiée. Une clé dédiée est préférable : on peut la révoquer sans toucher au backend.

```bash
# Sur votre machine
ssh-keygen -t ed25519 -C "github-actions-sts-admin" -f ~/.ssh/sts_admin_deploy -N ""

# Autoriser la clé sur le serveur
ssh-copy-id -i ~/.ssh/sts_admin_deploy.pub konan@<IP_DU_SERVEUR>

# Tester la connexion
ssh -i ~/.ssh/sts_admin_deploy konan@<IP_DU_SERVEUR> "echo ok"
```

### 2.3 Secrets GitHub

Ils se configurent dans le dépôt `jessicaangaman-design/synergietech`, sous **Settings → Secrets and variables → Actions → New repository secret**.

| Secret            | Obligatoire | Valeur                                                      |
| ----------------- | ----------- | ----------------------------------------------------------- |
| `SSH_HOST`        | oui         | IP ou domaine du serveur                                    |
| `SSH_USER`        | oui         | `konan`                                                     |
| `SSH_PRIVATE_KEY` | oui         | Contenu complet de `~/.ssh/sts_admin_deploy` (clé privée)   |
| `SSH_PORT`        | non         | Port SSH, `22` par défaut                                   |
| `DEPLOY_PATH`     | oui         | Résultat de `realpath`, ex. `/home/konan/infra/nginx/www/sts-admin` |

> Les secrets du dépôt `backend-sts` ne sont pas partagés avec ce dépôt : il faut les recréer ici.

### 2.4 Variables (facultatif)

Elles se configurent dans le même écran, onglet **Variables**. Sans elles, les valeurs par défaut s'appliquent.

| Variable              | Défaut                    |
| --------------------- | ------------------------- |
| `VITE_API_URL`        | `https://api.stssarl.com` |
| `VITE_AUTH_TOKEN_KEY` | `token`                   |

### 2.5 Configuration nginx recommandée

Ce fichier se trouve sur le serveur, dans la configuration nginx du site `admin.stssarl.com`.

```nginx
server {
    listen 443 ssl;
    server_name admin.stssarl.com;

    ssl_certificate     /etc/letsencrypt/live/admin.stssarl.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.stssarl.com/privkey.pem;

    root /usr/share/nginx/html/sts-admin;
    index index.html;

    # Fichiers versionnés (nom hashé) : cache long, et vraie 404 s'ils manquent
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html ne doit jamais rester en cache, sinon les utilisateurs gardent l'ancienne version
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # Routes de l'application (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Recharger ensuite nginx :

```bash
docker exec <conteneur-nginx> nginx -t && docker exec <conteneur-nginx> nginx -s reload
```

Sans le bloc `/assets/`, un fichier manquant renvoie `index.html` au lieu d'une 404. Le navigateur affiche alors une erreur « Failed to load module script … MIME type text/html ».

---

## 3. Déployer

### Automatiquement

Il suffit de merger ou de pousser sur `main` :

```bash
git checkout main
git merge dev
git push origin main
```

> Ce projet est connecté à Lovable : un push sur la branche connectée s'y synchronise aussi.
> Ne jamais forcer un push (`--force`) ni réécrire un historique déjà poussé.

### Manuellement

Dans **Actions → Build & Deploy (admin.stssarl.com) → Run workflow**, choisissez la branche à déployer.

### Suivre le déploiement

L'onglet **Actions** du dépôt affiche chaque exécution. Une exécution verte signifie que le site sert le nouveau build.

---

## 4. Revenir à une version précédente

1. Dans **Actions**, ouvrez une exécution réussie correspondant à la version voulue.
2. Cliquez sur **Re-run all jobs**. Le workflow reconstruit et redéploie exactement ce commit.

Autre solution : annuler le commit fautif avec `git revert <sha>`, puis pousser sur `main`.

---

## 5. Dépendances : utiliser pnpm

La CI installe les dépendances avec `pnpm install --frozen-lockfile`. Elle échoue si `pnpm-lock.yaml` ne correspond pas à `package.json`.

Après tout ajout ou mise à jour de dépendance :

```bash
pnpm install          # met à jour pnpm-lock.yaml
git add package.json pnpm-lock.yaml
```

> `package-lock.json` et `bun.lock` ne sont pas à jour : il leur manque par exemple `jspdf`. La CI ne les utilise pas.

---

## 6. Dépannage

| Symptôme dans les logs                                   | Cause probable et solution                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DEPLOY_PATH doit pointer vers le dossier sts-admin`     | Secret `DEPLOY_PATH` absent ou incorrect. Mettre le chemin absolu se terminant par `sts-admin`.      |
| `Permission denied (publickey)`                          | La clé publique n'est pas dans `~/.ssh/authorized_keys` du serveur, ou `SSH_PRIVATE_KEY` est incomplète (copier aussi les lignes `-----BEGIN/END-----`). |
| `rsync: command not found`                               | Installer rsync sur le serveur (`sudo apt install -y rsync`).                                         |
| `ERR_PNPM_OUTDATED_LOCKFILE`                             | `pnpm-lock.yaml` n'est pas à jour : lancer `pnpm install` et commiter le lockfile.                   |
| `Le site ne sert pas encore le nouveau build`            | Fichiers envoyés dans un autre dossier que celui servi par nginx (vérifier `DEPLOY_PATH` et le volume Docker), ou cache intermédiaire (Cloudflare…). |
| Page blanche, erreur « MIME type text/html » en console  | Ajouter le bloc `location /assets/` de la section 2.5.                                               |
| Erreurs CORS en console après déploiement                | L'origine n'est pas autorisée par l'API : l'ajouter dans `allowedOrigins` de `backend-sts/src/app.ts`, puis redéployer le backend. |

---

## 7. Déploiement manuel de secours

Si GitHub Actions est indisponible :

```bash
pnpm install --frozen-lockfile
pnpm build

# Assets d'abord, puis index.html
rsync -az dist/assets/ konan@<IP_DU_SERVEUR>:~/infra/nginx/www/sts-admin/assets/
rsync -az --delete --exclude=/assets/ dist/ konan@<IP_DU_SERVEUR>:~/infra/nginx/www/sts-admin/
```
