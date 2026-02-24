# KanFlow 관리자 메뉴얼

**버전**: 1.0.0
**최종 업데이트**: 2026-02-24
**대상**: KanFlow 자체 호스팅 서버 관리자

---

## 목차

1. [시스템 요구사항](#1-시스템-요구사항)
   - 1.1 [하드웨어 요구사항](#11-하드웨어-요구사항)
   - 1.2 [소프트웨어 요구사항](#12-소프트웨어-요구사항)
2. [설치 및 배포](#2-설치-및-배포)
   - 2.1 [사전 준비](#21-사전-준비)
   - 2.2 [소스 코드 클론](#22-소스-코드-클론)
   - 2.3 [환경 변수 설정](#23-환경-변수-설정)
   - 2.4 [개발 환경 실행](#24-개발-환경-실행)
   - 2.5 [운영 환경 배포](#25-운영-환경-배포)
   - 2.6 [데이터베이스 마이그레이션](#26-데이터베이스-마이그레이션)
   - 2.7 [초기 데이터 시딩](#27-초기-데이터-시딩)
3. [Docker 인프라 관리](#3-docker-인프라-관리)
   - 3.1 [개발 환경 (docker/dev)](#31-개발-환경-dockerdev)
   - 3.2 [운영 환경 (docker/prod)](#32-운영-환경-dockerprod)
   - 3.3 [컨테이너 모니터링](#33-컨테이너-모니터링)
   - 3.4 [로그 확인](#34-로그-확인)
4. [데이터베이스 관리](#4-데이터베이스-관리)
   - 4.1 [PostgreSQL 접속](#41-postgresql-접속)
   - 4.2 [Prisma Studio](#42-prisma-studio)
   - 4.3 [마이그레이션 관리](#43-마이그레이션-관리)
   - 4.4 [백업 및 복원](#44-백업-및-복원)
5. [워크스페이스 관리](#5-워크스페이스-관리)
   - 5.1 [워크스페이스 생성](#51-워크스페이스-생성)
   - 5.2 [멤버 관리](#52-멤버-관리)
   - 5.3 [권한 체계 (OWNER / ADMIN / MEMBER)](#53-권한-체계-owner--admin--member)
6. [보드 관리](#6-보드-관리)
   - 6.1 [보드 생성 / 삭제 / 아카이브](#61-보드-생성--삭제--아카이브)
   - 6.2 [보드 즐겨찾기](#62-보드-즐겨찾기)
   - 6.3 [보드 Export/Import](#63-보드-exportimport)
   - 6.4 [보드 템플릿 관리](#64-보드-템플릿-관리)
   - 6.5 [컬럼 설정 (WIP 제한, 색상, 설명)](#65-컬럼-설정-wip-제한-색상-설명)
7. [자동화 규칙 관리](#7-자동화-규칙-관리)
   - 7.1 [자동화 규칙 생성](#71-자동화-규칙-생성)
   - 7.2 [트리거/조건/액션 구성](#72-트리거조건액션-구성)
   - 7.3 [규칙 활성화/비활성화](#73-규칙-활성화비활성화)
8. [리포트 및 분석](#8-리포트-및-분석)
   - 8.1 [보드 통계](#81-보드-통계-컬럼별-카드수-우선순위-분포-멤버-워크로드)
   - 8.2 [CFD (누적 흐름도)](#82-cfd-누적-흐름도)
   - 8.3 [리드타임 / 처리량 분석](#83-리드타임--처리량-분석)
9. [알림 시스템](#9-알림-시스템)
   - 9.1 [알림 동작 원리](#91-알림-동작-원리)
   - 9.2 [마감일 임박 알림](#92-마감일-임박-알림)
   - 9.3 [스케줄러 설정](#93-스케줄러-설정)
10. [실시간 동기화 (WebSocket)](#10-실시간-동기화-websocket)
    - 10.1 [Socket.io 설정](#101-socketio-설정)
    - 10.2 [Redis Pub/Sub](#102-redis-pubsub)
11. [파일 스토리지 (MinIO)](#11-파일-스토리지-minio)
    - 11.1 [MinIO 설정](#111-minio-설정)
    - 11.2 [파일 업로드 제한](#112-파일-업로드-제한)
    - 11.3 [스토리지 관리](#113-스토리지-관리)
12. [보안](#12-보안)
    - 12.1 [JWT 인증](#121-jwt-인증)
    - 12.2 [비밀번호 정책](#122-비밀번호-정책)
    - 12.3 [CORS 설정](#123-cors-설정)
    - 12.4 [환경 변수 보안](#124-환경-변수-보안)
13. [유지보수](#13-유지보수)
    - 13.1 [로그 관리](#131-로그-관리)
    - 13.2 [성능 최적화](#132-성능-최적화)
    - 13.3 [아카이브 자동 삭제 (30일)](#133-아카이브-자동-삭제-30일)
    - 13.4 [트러블슈팅 가이드](#134-트러블슈팅-가이드)
14. [API 문서](#14-api-문서)
    - 14.1 [Swagger UI 접속](#141-swagger-ui-접속)
    - 14.2 [주요 API 엔드포인트 목록](#142-주요-api-엔드포인트-목록)

---

## 1. 시스템 요구사항

KanFlow는 Docker Compose 기반으로 동작하며, 동일한 서버에서 개발/운영 환경을 포트로 분리하여 운영합니다.

### 1.1 하드웨어 요구사항

| 항목 | 최소 사양 | 권장 사양 |
|------|-----------|-----------|
| CPU | 2 코어 | 4 코어 이상 |
| RAM | 4 GB | 8 GB 이상 |
| 디스크 | 20 GB SSD | 50 GB SSD 이상 |
| 네트워크 | 100 Mbps | 1 Gbps |

> **팁:** MinIO 파일 스토리지에 대용량 첨부파일이 예상되는 경우 디스크 용량을 넉넉히 확보하십시오. Docker 볼륨은 기본적으로 `/var/lib/docker/volumes/` 하위에 생성됩니다.

### 1.2 소프트웨어 요구사항

| 소프트웨어 | 최소 버전 | 설치 확인 명령 |
|-----------|-----------|---------------|
| Docker | 24.x 이상 | `docker --version` |
| Docker Compose | v2.x 이상 | `docker compose version` |
| Node.js | 20.x LTS 이상 | `node --version` |
| pnpm | 9.x 이상 | `pnpm --version` |
| Git | 2.x 이상 | `git --version` |

```bash
# 소프트웨어 버전 일괄 확인
docker --version
docker compose version
node --version
pnpm --version
git --version
```

> **주의:** Docker Compose V1(`docker-compose`) 명령어는 지원하지 않습니다. 반드시 V2(`docker compose`) 명령어를 사용하십시오.

---

## 2. 설치 및 배포

### 2.1 사전 준비

Docker 서비스가 실행 중인지 확인합니다.

```bash
# Docker 서비스 상태 확인
sudo systemctl status docker

# Docker 서비스 시작 (필요한 경우)
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 실행)
sudo usermod -aG docker $USER
newgrp docker
```

pnpm이 설치되어 있지 않다면 설치합니다.

```bash
# pnpm 설치
npm install -g pnpm@latest

# 설치 확인
pnpm --version
```

### 2.2 소스 코드 클론

```bash
# 저장소 클론
git clone https://github.com/your-org/kanflow.git
cd kanflow

# 의존성 설치 (monorepo 전체)
pnpm install
```

> **팁:** 내부망 환경에서는 Git SSH 키 설정 후 SSH URL로 클론하십시오.
> ```bash
> git clone git@github.com:your-org/kanflow.git
> ```

### 2.3 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다. `.env.example` 파일을 복사하여 시작하십시오.

```bash
cp .env.example .env
```

`.env` 파일 예시 (실제 운영 환경에서는 반드시 값을 변경하십시오):

```dotenv
# ============================================================
# 데이터베이스 (개발 환경: 포트 5433, 운영 환경: 포트 5432)
# ============================================================
DATABASE_URL="postgresql://kanflow:YOUR_DB_PASSWORD@localhost:5433/kanflow_dev"

# ============================================================
# JWT 인증
# ============================================================
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# ============================================================
# Redis (개발 환경: 포트 6380, 운영 환경: 포트 6379)
# ============================================================
REDIS_URL="redis://localhost:6380"

# ============================================================
# MinIO 파일 스토리지 (개발 환경: 포트 9000)
# ============================================================
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="your-minio-access-key"
MINIO_SECRET_KEY="your-minio-secret-key"
MINIO_BUCKET="kanflow-uploads"

# ============================================================
# 백엔드 서버
# ============================================================
PORT="4000"
CORS_ORIGIN="http://localhost:3000"

# ============================================================
# 프론트엔드
# ============================================================
VITE_API_URL="http://localhost:4000/api"
VITE_WS_URL="http://localhost:4000"
```

> **주의:** `.env` 파일을 절대로 Git에 커밋하지 마십시오. `.gitignore`에 `.env`가 포함되어 있는지 반드시 확인하십시오.

### 2.4 개발 환경 실행

개발 환경은 로컬 머신에서 프론트엔드와 백엔드를 핫 리로드로 실행합니다.

```bash
# 1단계: 개발 인프라(PostgreSQL, Redis, MinIO) 컨테이너 시작
pnpm docker:dev

# 2단계: 컨테이너 헬스체크 대기 (약 10~20초)
docker ps

# 3단계: 데이터베이스 마이그레이션 실행
pnpm db:migrate

# 4단계: 초기 테스트 데이터 시딩 (선택 사항)
pnpm db:seed

# 5단계: 개발 서버 실행 (프론트엔드 :3000 + 백엔드 :4000)
pnpm dev
```

개발 환경 서비스 포트:

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:4000/api |
| Swagger 문서 | http://localhost:4000/api/docs |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |

```bash
# 프론트엔드만 실행
pnpm dev:frontend

# 백엔드만 실행
pnpm dev:backend
```

### 2.5 운영 환경 배포

운영 환경은 Docker Compose로 모든 서비스를 컨테이너로 실행합니다.

```bash
# 1단계: 운영용 환경 변수 설정
#   .env 파일에서 DATABASE_URL을 운영 DB(포트 5432)로 변경
#   JWT_SECRET을 강력한 랜덤 값으로 변경
#   CORS_ORIGIN을 실제 도메인으로 변경

# 2단계: 프로덕션 빌드
pnpm build

# 3단계: 운영 컨테이너 시작
pnpm docker:prod
```

`docker/prod/docker-compose.yml`에서 관리되는 서비스:

| 컨테이너 | 이름 | 역할 |
|---------|------|------|
| Nginx | kanflow-nginx | 리버스 프록시, 정적 파일 서빙 (:80) |
| Backend | kanflow-backend | NestJS API 서버 (:4000) |
| PostgreSQL | kanflow-postgres-prod | 운영 데이터베이스 (:5432) |
| Redis | kanflow-redis-prod | 캐시 및 Pub/Sub (:6379) |
| MinIO | kanflow-minio-prod | 파일 오브젝트 스토리지 |

```bash
# 운영 컨테이너 중지
pnpm docker:down
```

> **주의:** 개발 DB(:5433)와 운영 DB(:5432)를 절대로 혼용하지 마십시오. 마이그레이션은 반드시 개발 DB에서 먼저 검증 후 운영 DB에 적용하십시오.

### 2.6 데이터베이스 마이그레이션

```bash
# 개발 DB에 마이그레이션 적용 (포트 5433)
pnpm db:migrate

# 운영 DB에 마이그레이션 적용 (포트 5432)
pnpm db:migrate:prod
```

`pnpm db:migrate`는 내부적으로 다음 명령을 실행합니다:

```bash
# 개발 환경 마이그레이션 명령 (참고용)
DATABASE_URL="postgresql://kanflow:kanflow_dev_2026@localhost:5433/kanflow_dev" \
  npx prisma migrate dev
```

> **팁:** 새로운 Prisma 스키마 변경 후 마이그레이션 파일을 생성하려면:
> ```bash
> # 마이그레이션 파일 생성 (이름을 설명적으로 작성)
> DATABASE_URL="postgresql://kanflow:kanflow_dev_2026@localhost:5433/kanflow_dev" \
>   npx prisma migrate dev --name add_new_feature
> ```

### 2.7 초기 데이터 시딩

개발/테스트 목적으로 초기 데이터를 데이터베이스에 삽입합니다.

```bash
pnpm db:seed
```

시딩 스크립트는 `apps/backend/prisma/seed.ts`에 위치합니다. 시딩 내용:
- 테스트 사용자 계정 (이메일/비밀번호)
- 샘플 워크스페이스
- 샘플 보드 및 컬럼
- 샘플 카드 데이터

> **주의:** 운영 환경에서는 `pnpm db:seed`를 실행하지 마십시오. 시딩은 개발/스테이징 환경 전용입니다.

---

## 3. Docker 인프라 관리

KanFlow는 개발과 운영 환경을 동일한 서버에서 운영할 수 있도록 포트를 분리합니다.

| 서비스 | 개발 포트 | 운영 포트 |
|--------|-----------|-----------|
| Frontend | :3000 | - (Nginx 내장) |
| Backend | :4000 | :4000 |
| PostgreSQL | :5433 | :5432 |
| Redis | :6380 | :6379 |
| MinIO | :9000 | - (내부망) |
| MinIO Console | :9001 | - |
| Nginx | - | :80 |

### 3.1 개발 환경 (docker/dev)

개발 환경은 `docker/dev/docker-compose.yml`로 관리되며, 데이터베이스, Redis, MinIO만 컨테이너로 실행합니다.

```bash
# 개발 인프라 시작
pnpm docker:dev

# 개발 인프라 상태 확인
docker ps --filter "name=kanflow" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 개발 인프라 중지
pnpm docker:down
```

개발 Docker Compose 구성 (`docker/dev/docker-compose.yml`):

```yaml
services:
  postgres-dev:
    image: postgres:16-alpine
    container_name: kanflow-postgres-dev
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: kanflow
      POSTGRES_PASSWORD: kanflow_dev_2026
      POSTGRES_DB: kanflow_dev
    volumes:
      - kanflow-pg-dev:/var/lib/postgresql/data

  redis-dev:
    image: redis:7-alpine
    container_name: kanflow-redis-dev
    ports:
      - "6380:6379"
    volumes:
      - kanflow-redis-dev:/data

  minio-dev:
    image: minio/minio:latest
    container_name: kanflow-minio-dev
    ports:
      - "9000:9000"
      - "9001:9001"       # MinIO Console
    environment:
      MINIO_ROOT_USER: kanflow_minio
      MINIO_ROOT_PASSWORD: kanflow_minio_secret_2026
    command: server /data --console-address ":9001"
```

### 3.2 운영 환경 (docker/prod)

운영 환경은 `docker/prod/docker-compose.yml`로 관리되며, 백엔드 애플리케이션까지 모두 컨테이너로 실행합니다.

```bash
# 운영 환경 전체 시작
pnpm docker:prod

# 특정 서비스만 재시작
docker compose -f docker/prod/docker-compose.yml restart backend

# 운영 환경 중지
pnpm docker:down
```

운영 환경 백엔드 컨테이너에 필요한 환경 변수는 `docker/prod/docker-compose.yml`의 `environment` 섹션에서 관리합니다. 민감한 값은 `${VAR}` 형식으로 호스트의 환경 변수 또는 `.env` 파일에서 주입합니다.

```yaml
backend:
  environment:
    DATABASE_URL: "postgresql://kanflow:kanflow_prod_2026@postgres:5432/kanflow_prod"
    REDIS_URL: "redis://redis:6379"
    JWT_SECRET: "${JWT_SECRET}"
    MINIO_ACCESS_KEY: "${MINIO_ACCESS_KEY}"
    MINIO_SECRET_KEY: "${MINIO_SECRET_KEY}"
```

### 3.3 컨테이너 모니터링

```bash
# 모든 KanFlow 컨테이너 상태 확인
docker ps --filter "name=kanflow"

# 실시간 리소스 사용량 모니터링 (CPU, 메모리, 네트워크)
docker stats $(docker ps --filter "name=kanflow" -q)

# 컨테이너 상세 정보 확인
docker inspect kanflow-backend

# 컨테이너 내부 쉘 접속
docker exec -it kanflow-backend sh
docker exec -it kanflow-postgres-prod bash
```

헬스체크 상태 확인:

```bash
# 헬스체크 상태 확인
docker inspect --format='{{.State.Health.Status}}' kanflow-postgres-prod
docker inspect --format='{{.State.Health.Status}}' kanflow-redis-prod

# 헬스체크 로그 확인
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' kanflow-postgres-prod
```

### 3.4 로그 확인

```bash
# 백엔드 로그 실시간 확인
docker logs -f kanflow-backend

# 최근 100줄 로그 확인
docker logs --tail 100 kanflow-backend

# 특정 시간 이후 로그 확인
docker logs --since "2026-02-24T00:00:00" kanflow-backend

# PostgreSQL 로그 확인
docker logs -f kanflow-postgres-prod

# Redis 로그 확인
docker logs -f kanflow-redis-prod

# 모든 컨테이너 로그 동시 확인 (docker compose)
docker compose -f docker/prod/docker-compose.yml logs -f
```

> **팁:** 로그 분석에 `grep`을 활용하면 오류만 필터링할 수 있습니다.
> ```bash
> docker logs kanflow-backend 2>&1 | grep -i "error\|warn"
> ```

---

## 4. 데이터베이스 관리

KanFlow는 PostgreSQL 16을 사용하며, Prisma ORM을 통해 모든 DB 접근을 관리합니다.

### 4.1 PostgreSQL 접속

**개발 DB 접속:**

```bash
# psql로 직접 접속 (Docker 컨테이너 내부)
docker exec -it kanflow-postgres-dev psql -U kanflow -d kanflow_dev

# 호스트에서 psql 클라이언트로 접속 (포트 5433)
psql -h localhost -p 5433 -U kanflow -d kanflow_dev
```

**운영 DB 접속:**

```bash
# 운영 DB 접속 (컨테이너 내부)
docker exec -it kanflow-postgres-prod psql -U kanflow -d kanflow_prod

# 호스트에서 접속 (포트 5432)
psql -h localhost -p 5432 -U kanflow -d kanflow_prod
```

유용한 psql 명령어:

```sql
-- 테이블 목록 확인
\dt

-- 특정 테이블 스키마 확인
\d users
\d boards
\d cards

-- 사용자 수 확인
SELECT COUNT(*) FROM users;

-- 워크스페이스 목록
SELECT id, name, slug, created_at FROM workspaces;

-- 보드 목록 (아카이브 포함)
SELECT id, title, workspace_id, archived_at FROM boards ORDER BY created_at DESC;

-- 연결 종료
\q
```

### 4.2 Prisma Studio

Prisma Studio는 데이터베이스를 GUI로 탐색하고 편집할 수 있는 웹 UI입니다.

```bash
# 개발 DB에 연결하여 Prisma Studio 실행
pnpm db:studio
```

브라우저에서 `http://localhost:5555`로 접속합니다.

> **팁:** Prisma Studio에서는 데이터를 직접 수정할 수 있습니다. 운영 DB에서는 반드시 주의하여 사용하십시오. 수정 전 반드시 백업을 먼저 수행하십시오.

> **주의:** `pnpm db:studio`는 `.env`의 `DATABASE_URL`에 설정된 DB에 접속합니다. 운영 DB에 접속하려면 `DATABASE_URL`을 운영 DB URL로 임시 변경하거나 별도의 환경 변수를 주입하십시오.

### 4.3 마이그레이션 관리

Prisma 마이그레이션 파일은 `apps/backend/prisma/migrations/` 디렉터리에 위치합니다.

```bash
# 현재 마이그레이션 상태 확인
DATABASE_URL="postgresql://kanflow:kanflow_dev_2026@localhost:5433/kanflow_dev" \
  npx prisma migrate status

# 개발 DB 마이그레이션 적용
pnpm db:migrate

# 운영 DB 마이그레이션 적용 (주의: 백업 후 실행)
pnpm db:migrate:prod

# 마이그레이션 히스토리 확인
ls -la apps/backend/prisma/migrations/
```

새로운 마이그레이션 생성 절차:

```bash
# 1. schema.prisma 파일 수정
# 2. 마이그레이션 파일 생성
DATABASE_URL="postgresql://kanflow:kanflow_dev_2026@localhost:5433/kanflow_dev" \
  npx prisma migrate dev --name describe_your_change

# 3. Prisma 클라이언트 재생성
npx prisma generate

# 4. 개발 환경에서 검증 후 운영 환경에 적용
pnpm db:migrate:prod
```

> **주의:** 운영 DB 마이그레이션 전 반드시 백업을 수행하십시오. 마이그레이션은 되돌리기 어려울 수 있습니다.

### 4.4 백업 및 복원

**백업:**

```bash
# 개발 DB 백업
docker exec kanflow-postgres-dev \
  pg_dump -U kanflow kanflow_dev \
  > backup_dev_$(date +%Y%m%d_%H%M%S).sql

# 운영 DB 백업
docker exec kanflow-postgres-prod \
  pg_dump -U kanflow kanflow_prod \
  > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# 압축 백업 (대용량 DB 권장)
docker exec kanflow-postgres-prod \
  pg_dump -U kanflow kanflow_prod \
  | gzip > backup_prod_$(date +%Y%m%d_%H%M%S).sql.gz
```

**복원:**

```bash
# SQL 파일로 복원
docker exec -i kanflow-postgres-dev \
  psql -U kanflow kanflow_dev \
  < backup_dev_20260224_120000.sql

# 압축 파일로 복원
gunzip -c backup_prod_20260224_120000.sql.gz \
  | docker exec -i kanflow-postgres-prod \
    psql -U kanflow kanflow_prod
```

**자동 백업 스크립트 예시 (크론탭):**

```bash
# /usr/local/bin/kanflow-backup.sh 로 저장
#!/bin/bash
BACKUP_DIR="/var/backups/kanflow"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker exec kanflow-postgres-prod \
  pg_dump -U kanflow kanflow_prod \
  | gzip > "$BACKUP_DIR/prod_$DATE.sql.gz"

# 30일 이상 된 백업 파일 삭제
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/prod_$DATE.sql.gz"
```

```bash
# 스크립트 실행 권한 부여
chmod +x /usr/local/bin/kanflow-backup.sh

# 크론탭 등록 (매일 새벽 2시 백업)
crontab -e
# 아래 줄 추가:
# 0 2 * * * /usr/local/bin/kanflow-backup.sh >> /var/log/kanflow-backup.log 2>&1
```

---

## 5. 워크스페이스 관리

워크스페이스는 KanFlow의 최상위 조직 단위입니다. 하나의 워크스페이스 안에 여러 보드가 포함됩니다.

![워크스페이스 목록 화면](images/01-workspace-list.png)

### 5.1 워크스페이스 생성

워크스페이스는 사용자가 UI에서 생성하거나 API를 통해 생성합니다.

**UI에서 생성:**
1. 로그인 후 워크스페이스 목록 페이지에서 "새 워크스페이스 만들기" 버튼을 클릭합니다.
2. 이름과 설명(선택)을 입력합니다.
3. 슬러그(URL 식별자)는 이름을 기반으로 자동 생성됩니다.

**API로 생성:**

```bash
curl -X POST http://localhost:4000/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "개발팀 워크스페이스",
    "description": "프론트엔드/백엔드 개발팀의 업무 보드"
  }'
```

응답 예시:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "개발팀 워크스페이스",
  "slug": "dev-workspace",
  "description": "프론트엔드/백엔드 개발팀의 업무 보드",
  "ownerId": "user-uuid",
  "createdAt": "2026-02-24T00:00:00.000Z"
}
```

![워크스페이스 상세 화면](images/02-workspace-detail.png)

### 5.2 멤버 관리

**멤버 추가:**

```bash
# 워크스페이스에 멤버 추가 (이메일로 초대)
curl -X POST http://localhost:4000/api/workspaces/{workspaceId}/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@example.com",
    "role": "MEMBER"
  }'
```

**멤버 역할 변경:**

```bash
curl -X PATCH http://localhost:4000/api/workspaces/{workspaceId}/members/{userId}/role \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

**멤버 제거:**

```bash
curl -X DELETE http://localhost:4000/api/workspaces/{workspaceId}/members/{userId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**직접 DB에서 멤버 조회:**

```sql
-- 특정 워크스페이스의 멤버 목록 조회
SELECT
  u.name, u.email, wm.role, wm.joined_at
FROM workspace_members wm
JOIN users u ON u.id = wm.user_id
WHERE wm.workspace_id = 'your-workspace-id'
ORDER BY wm.joined_at ASC;
```

### 5.3 권한 체계 (OWNER / ADMIN / MEMBER)

KanFlow는 워크스페이스와 보드 레벨에서 각각 역할 기반 접근 제어(RBAC)를 적용합니다.

**워크스페이스 역할:**

| 역할 | 설명 | 보드 생성 | 멤버 관리 | 워크스페이스 삭제 |
|------|------|-----------|-----------|-----------------|
| OWNER | 워크스페이스 소유자 | O | O | O |
| ADMIN | 관리자 | O | O | X |
| MEMBER | 일반 멤버 | O | X | X |
| VIEWER | 읽기 전용 | X | X | X |

**보드 역할:**

| 역할 | 카드 생성/수정 | 컬럼 관리 | 보드 설정 | 멤버 관리 |
|------|--------------|-----------|-----------|-----------|
| OWNER | O | O | O | O |
| ADMIN | O | O | O | O |
| MEMBER | O | X | X | X |
| VIEWER | X | X | X | X |

> **팁:** 워크스페이스 OWNER는 해당 워크스페이스 내 모든 보드에 자동으로 최상위 권한을 갖습니다. 보드별 멤버 초대는 별도로 관리됩니다.

---

## 6. 보드 관리

보드는 칸반 작업 공간으로, 컬럼과 카드로 구성됩니다.

![보드 칸반 화면](images/03-board-kanban.png)

### 6.1 보드 생성 / 삭제 / 아카이브

**보드 생성 (API):**

```bash
curl -X POST http://localhost:4000/api/workspaces/{workspaceId}/boards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "스프린트 #1",
    "description": "2026년 1분기 스프린트",
    "visibility": "PRIVATE"
  }'
```

`visibility` 값: `PUBLIC` (워크스페이스 전체 공개) 또는 `PRIVATE` (멤버만 접근)

**보드 아카이브:**

아카이브된 보드는 즉시 삭제되지 않고 30일 후 자동으로 영구 삭제됩니다.

```bash
# 보드 아카이브
curl -X PATCH http://localhost:4000/api/boards/{boardId}/archive \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 아카이브 복원
curl -X PATCH http://localhost:4000/api/boards/{boardId}/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**보드 영구 삭제:**

```bash
curl -X DELETE http://localhost:4000/api/boards/{boardId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

> **주의:** 보드를 영구 삭제하면 해당 보드의 모든 컬럼, 카드, 첨부파일, 활동 로그가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.

**아카이브된 보드 DB 직접 조회:**

```sql
-- 아카이브된 보드 목록 조회
SELECT id, title, archived_at,
       archived_at + INTERVAL '30 days' AS will_be_deleted_at
FROM boards
WHERE archived_at IS NOT NULL
ORDER BY archived_at ASC;
```

### 6.2 보드 즐겨찾기

사용자는 자주 사용하는 보드를 즐겨찾기에 추가할 수 있습니다. 즐겨찾기된 보드는 대시보드 상단에 표시됩니다.

```bash
# 즐겨찾기 추가
curl -X POST http://localhost:4000/api/boards/{boardId}/favorite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 즐겨찾기 제거
curl -X DELETE http://localhost:4000/api/boards/{boardId}/favorite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

DB에서 즐겨찾기 데이터는 `board_favorites` 테이블에 저장됩니다.

```sql
-- 사용자의 즐겨찾기 보드 조회
SELECT b.title, bf.created_at
FROM board_favorites bf
JOIN boards b ON b.id = bf.board_id
WHERE bf.user_id = 'your-user-id'
ORDER BY bf.created_at DESC;
```

### 6.3 보드 Export/Import

**보드 Export (JSON):**

```bash
curl -X GET http://localhost:4000/api/boards/{boardId}/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o board_export.json
```

Export 파일에는 보드 설정, 컬럼 구조, 카드 정보, 레이블이 포함됩니다.

**보드 Import (JSON에서 새 보드 생성):**

```bash
curl -X POST http://localhost:4000/api/workspaces/{workspaceId}/boards/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @board_export.json
```

> **팁:** Export/Import 기능은 보드 구조를 다른 워크스페이스로 복제하거나 백업할 때 유용합니다. 카드 담당자, 댓글 등 사용자별 데이터는 포함되지 않습니다.

### 6.4 보드 템플릿 관리

자주 사용하는 보드 구조를 템플릿으로 저장하여 새 보드 생성 시 재사용할 수 있습니다.

**템플릿 생성:**

```bash
# 현재 보드를 템플릿으로 저장
curl -X POST http://localhost:4000/api/templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "스크럼 스프린트 템플릿",
    "description": "백로그, 진행중, 검토, 완료 컬럼 포함",
    "templateData": {
      "columns": [
        {"title": "백로그", "columnType": "TODO", "color": "#94a3b8"},
        {"title": "진행중", "columnType": "IN_PROGRESS", "color": "#3b82f6"},
        {"title": "검토 중", "columnType": "CUSTOM", "color": "#f59e0b"},
        {"title": "완료", "columnType": "DONE", "color": "#22c55e"}
      ]
    }
  }'
```

**템플릿 목록 조회:**

```bash
curl -X GET http://localhost:4000/api/templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**템플릿 적용:**

```bash
curl -X POST http://localhost:4000/api/templates/{templateId}/apply \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"boardId": "target-board-id"}'
```

DB에서 템플릿 데이터는 `board_templates` 테이블의 `template_data` JSON 컬럼에 저장됩니다.

### 6.5 컬럼 설정 (WIP 제한, 색상, 설명)

컬럼별로 WIP(Work In Progress) 제한, 색상 코드, 설명을 설정할 수 있습니다.

![컬럼 설정 메뉴](images/13-column-settings.png)

**컬럼 설정 업데이트 (API):**

```bash
curl -X PATCH http://localhost:4000/api/columns/{columnId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "진행중",
    "description": "현재 개발 중인 작업",
    "wipLimit": 5,
    "color": "#3b82f6",
    "columnType": "IN_PROGRESS"
  }'
```

`columnType` 값: `TODO`, `IN_PROGRESS`, `DONE`, `CUSTOM`

WIP 제한이 설정된 컬럼에서 카드 수가 제한을 초과하면 UI에서 경고를 표시합니다.

**컬럼 순서 변경 (드래그 앤 드롭):**

컬럼은 소수점 인덱싱(Fractional Indexing)을 사용하여 위치를 관리합니다. UI에서 드래그로 순서를 변경하면 API를 통해 새 위치가 계산됩니다.

```bash
# 컬럼 위치 이동
curl -X PATCH http://localhost:4000/api/columns/{columnId}/move \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": 2048.5
  }'
```

**DB에서 컬럼 정보 조회:**

```sql
-- 특정 보드의 컬럼 목록
SELECT id, title, column_type, position, wip_limit, color, archived_at
FROM columns
WHERE board_id = 'your-board-id'
  AND archived_at IS NULL
ORDER BY position ASC;
```

---

## 7. 자동화 규칙 관리

자동화 규칙은 특정 이벤트(트리거)가 발생하면 조건을 검사하여 정해진 액션을 자동으로 실행합니다.

![자동화 규칙 목록 화면](images/17-automations.png)

### 7.1 자동화 규칙 생성

자동화 규칙은 보드별로 관리됩니다.

![자동화 규칙 생성 폼](images/18-automation-create.png)

**API로 규칙 생성:**

```bash
curl -X POST http://localhost:4000/api/boards/{boardId}/automations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "완료 컬럼 이동 시 우선순위 낮춤",
    "trigger": {
      "type": "cardMoved",
      "toColumnId": "done-column-id"
    },
    "conditions": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "HIGH"
      }
    ],
    "actions": [
      {
        "type": "setPriority",
        "params": { "priority": "LOW" }
      }
    ],
    "isEnabled": true
  }'
```

### 7.2 트리거/조건/액션 구성

**지원 트리거 타입:**

| 트리거 | 설명 | 필요 파라미터 |
|--------|------|--------------|
| `cardMoved` | 카드가 다른 컬럼으로 이동 | `toColumnId` (선택) |
| `cardCreated` | 새 카드 생성 | 없음 |
| `labelAdded` | 카드에 레이블 추가 | `labelId` (선택) |

**지원 조건 연산자:**

| 연산자 | 설명 |
|--------|------|
| `equals` | 값이 정확히 일치 |
| `notEquals` | 값이 일치하지 않음 |
| `contains` | 텍스트에 값이 포함 |
| `notContains` | 텍스트에 값이 미포함 |

조건에서 사용 가능한 카드 필드: `priority`, `title`, `columnId`

**지원 액션 타입:**

| 액션 | 설명 | 필요 파라미터 |
|------|------|--------------|
| `moveCard` | 카드를 다른 컬럼으로 이동 | `columnId` |
| `setLabel` | 카드에 레이블 추가 | `labelId` |
| `setAssignee` | 카드에 담당자 지정 | `userId` |
| `setPriority` | 우선순위 변경 | `priority` (CRITICAL/HIGH/MEDIUM/LOW) |
| `addComment` | 자동 댓글 추가 | `content`, `authorId` |
| `setDueDate` | 마감일 설정 | `dueDate` (ISO 8601) |
| `archive` | 카드 아카이브 | 없음 |
| `sendNotification` | 담당자에게 알림 전송 | `title`, `message`, `link` |
| `createChecklist` | 체크리스트 생성 | `title` |

**자동화 실행 로그 확인:**

```bash
curl -X GET "http://localhost:4000/api/boards/{boardId}/automations/{ruleId}/logs?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

DB에서 직접 실행 로그 조회:

```sql
-- 자동화 실행 로그 최근 50건
SELECT
  ael.id, ar.name AS rule_name,
  ael.status, ael.card_id, ael.details, ael.created_at
FROM automation_execution_logs ael
JOIN automation_rules ar ON ar.id = ael.rule_id
WHERE ar.board_id = 'your-board-id'
ORDER BY ael.created_at DESC
LIMIT 50;
```

### 7.3 규칙 활성화/비활성화

```bash
# 규칙 토글 (활성 → 비활성 또는 비활성 → 활성)
curl -X PATCH http://localhost:4000/api/boards/{boardId}/automations/{ruleId}/toggle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 규칙 업데이트 (isEnabled 직접 지정)
curl -X PATCH http://localhost:4000/api/boards/{boardId}/automations/{ruleId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": false}'
```

DB에서 직접 비활성화:

```sql
-- 특정 보드의 모든 자동화 규칙 비활성화
UPDATE automation_rules
SET is_enabled = false
WHERE board_id = 'your-board-id';
```

---

## 8. 리포트 및 분석

KanFlow는 보드의 작업 흐름을 시각화하는 다양한 분석 리포트를 제공합니다.

![리포트 페이지](images/19-reports.png)

### 8.1 보드 통계 (컬럼별 카드수, 우선순위 분포, 멤버 워크로드)

**보드 통계 API:**

```bash
curl -X GET http://localhost:4000/api/boards/{boardId}/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

응답 예시:

```json
{
  "totalCards": 42,
  "cardsByColumn": [
    {"columnId": "col-1", "columnTitle": "백로그", "count": 15},
    {"columnId": "col-2", "columnTitle": "진행중", "count": 8},
    {"columnId": "col-3", "columnTitle": "완료", "count": 19}
  ],
  "cardsByPriority": {
    "CRITICAL": 3,
    "HIGH": 12,
    "MEDIUM": 20,
    "LOW": 7
  },
  "memberWorkload": [
    {"userId": "user-1", "userName": "홍길동", "cardCount": 5},
    {"userId": "user-2", "userName": "김철수", "cardCount": 3}
  ]
}
```

**DB에서 직접 통계 쿼리:**

```sql
-- 컬럼별 카드 수
SELECT c.title AS column_title, COUNT(ca.id) AS card_count
FROM columns c
LEFT JOIN cards ca ON ca.column_id = c.id AND ca.archived_at IS NULL
WHERE c.board_id = 'your-board-id' AND c.archived_at IS NULL
GROUP BY c.id, c.title, c.position
ORDER BY c.position ASC;

-- 우선순위별 카드 분포
SELECT priority, COUNT(*) AS count
FROM cards
WHERE board_id = 'your-board-id' AND archived_at IS NULL
GROUP BY priority
ORDER BY priority;

-- 멤버별 워크로드
SELECT u.name, COUNT(ca.card_id) AS assigned_cards
FROM card_assignees ca
JOIN users u ON u.id = ca.user_id
JOIN cards c ON c.id = ca.card_id
WHERE c.board_id = 'your-board-id' AND c.archived_at IS NULL
GROUP BY u.id, u.name
ORDER BY assigned_cards DESC;
```

### 8.2 CFD (누적 흐름도)

CFD(Cumulative Flow Diagram)는 날짜별 컬럼의 카드 수 변화를 누적 차트로 보여줍니다.

CFD 데이터는 매일 자정(00:00)에 스케줄러가 각 보드의 컬럼별 카드 수 스냅샷을 `column_snapshots` 테이블에 기록하여 생성됩니다.

**CFD 데이터 API:**

```bash
curl -X GET "http://localhost:4000/api/boards/{boardId}/reports/cfd?from=2026-01-01&to=2026-02-24" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

응답 예시:

```json
[
  {
    "date": "2026-02-01",
    "columns": [
      {"columnId": "col-1", "columnTitle": "백로그", "count": 20},
      {"columnId": "col-2", "columnTitle": "진행중", "count": 5},
      {"columnId": "col-3", "columnTitle": "완료", "count": 2}
    ]
  },
  {
    "date": "2026-02-02",
    "columns": [...]
  }
]
```

**수동으로 스냅샷 생성 (스케줄러 미실행 시):**

```sql
-- 오늘 날짜 스냅샷 수동 삽입
INSERT INTO column_snapshots (id, board_id, column_id, card_count, date, created_at)
SELECT
  gen_random_uuid(),
  c.board_id,
  c.id,
  COUNT(ca.id),
  CURRENT_DATE,
  NOW()
FROM columns c
LEFT JOIN cards ca ON ca.column_id = c.id AND ca.archived_at IS NULL
WHERE c.board_id = 'your-board-id' AND c.archived_at IS NULL
GROUP BY c.board_id, c.id
ON CONFLICT (column_id, date) DO UPDATE SET card_count = EXCLUDED.card_count;
```

### 8.3 리드타임 / 처리량 분석

**리드타임 데이터:** 카드가 처음 TODO 컬럼에 진입한 시점부터 DONE 컬럼에 도달한 시점까지의 소요 시간(시간 단위)을 분석합니다.

```bash
curl -X GET "http://localhost:4000/api/boards/{boardId}/reports/lead-time?from=2026-01-01&to=2026-02-24" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**처리량(Throughput) 데이터:** 날짜별로 DONE 컬럼에 진입한 카드 수를 계산합니다.

```bash
curl -X GET "http://localhost:4000/api/boards/{boardId}/reports/throughput?from=2026-01-01&to=2026-02-24" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

리드타임 및 처리량 계산을 위해 카드가 이동할 때마다 `card_status_logs` 테이블에 이동 기록이 저장됩니다.

```sql
-- 특정 카드의 이동 이력 조회
SELECT
  csl.moved_at,
  cf.title AS from_column,
  ct.title AS to_column
FROM card_status_logs csl
LEFT JOIN columns cf ON cf.id = csl.from_column_id
JOIN columns ct ON ct.id = csl.to_column_id
WHERE csl.card_id = 'your-card-id'
ORDER BY csl.moved_at ASC;

-- 카드별 리드타임 직접 계산 (TODO→DONE)
WITH todo_entries AS (
  SELECT DISTINCT ON (csl.card_id)
    csl.card_id, csl.moved_at AS started_at
  FROM card_status_logs csl
  JOIN columns c ON c.id = csl.to_column_id
  WHERE c.board_id = 'your-board-id' AND c.column_type = 'TODO'
  ORDER BY csl.card_id, csl.moved_at ASC
),
done_entries AS (
  SELECT DISTINCT ON (csl.card_id)
    csl.card_id, csl.moved_at AS completed_at
  FROM card_status_logs csl
  JOIN columns c ON c.id = csl.to_column_id
  WHERE c.board_id = 'your-board-id' AND c.column_type = 'DONE'
  ORDER BY csl.card_id, csl.moved_at ASC
)
SELECT
  ca.title,
  t.started_at,
  d.completed_at,
  ROUND(EXTRACT(EPOCH FROM (d.completed_at - t.started_at)) / 3600, 2) AS lead_time_hours
FROM todo_entries t
JOIN done_entries d ON d.card_id = t.card_id
JOIN cards ca ON ca.id = t.card_id
WHERE d.completed_at > t.started_at
ORDER BY lead_time_hours ASC;
```

---

## 9. 알림 시스템

KanFlow는 카드 이벤트 발생 시 담당자에게 알림을 전송합니다.

### 9.1 알림 동작 원리

알림은 두 가지 채널로 전달됩니다:

1. **인앱 알림**: `notifications` 테이블에 저장되어 UI의 알림 벨에 표시
2. **WebSocket 실시간 알림**: Socket.io를 통해 즉시 전달

**알림 타입:**

| 타입 | 발생 시점 |
|------|----------|
| `CARD_ASSIGNED` | 카드에 담당자로 지정될 때 |
| `CARD_COMMENTED` | 담당한 카드에 댓글 추가 시 |
| `CARD_DUE_SOON` | 마감일 24시간 이내 (스케줄러) |
| `CARD_MOVED` | 담당한 카드가 다른 컬럼으로 이동 시 |
| `MEMBER_ADDED` | 워크스페이스/보드에 초대될 때 |

**알림 DB 조회:**

```sql
-- 미읽은 알림 수 (사용자별)
SELECT u.name, COUNT(n.id) AS unread_count
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.is_read = false
GROUP BY u.id, u.name
ORDER BY unread_count DESC;

-- 특정 사용자의 최근 알림
SELECT type, title, message, is_read, created_at
FROM notifications
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 20;
```

### 9.2 마감일 임박 알림

마감일 24시간 이내 카드에 대해 담당자에게 자동으로 알림을 전송합니다.

스케줄러는 매일 오전 8시에 실행됩니다 (`@Cron('0 8 * * *')`).

```bash
# 마감일 임박 알림 수동 실행 (테스트 목적)
curl -X POST http://localhost:4000/api/notifications/send-due-reminders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**마감일이 임박한 카드 DB 조회:**

```sql
-- 현재 시각 기준 24시간 내 마감인 카드
SELECT
  ca.title, ca.due_date, u.name AS assignee,
  EXTRACT(EPOCH FROM (ca.due_date - NOW())) / 3600 AS hours_until_due
FROM cards ca
JOIN card_assignees asm ON asm.card_id = ca.id
JOIN users u ON u.id = asm.user_id
WHERE ca.due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  AND ca.archived_at IS NULL
ORDER BY ca.due_date ASC;
```

### 9.3 스케줄러 설정

백엔드의 `BoardScheduler` 클래스(`apps/backend/src/modules/board/board.scheduler.ts`)에서 모든 스케줄 작업을 관리합니다.

| 스케줄 작업 | Cron 표현식 | 설명 |
|------------|-------------|------|
| 아카이브 자동 삭제 | `0 3 * * *` | 매일 새벽 3시, 30일 지난 아카이브 보드 삭제 |
| 마감일 임박 알림 | `0 8 * * *` | 매일 오전 8시, 24시간 내 마감 카드 알림 |
| 반복 카드 생성 | `*/30 * * * *` | 30분마다 반복 카드 생성 여부 확인 |
| CFD 스냅샷 | `0 0 * * *` | 매일 자정, 컬럼별 카드 수 스냅샷 저장 |

Cron 표현식 형식: `분 시 일 월 요일`

```bash
# 스케줄러 작업 실행 로그 확인
docker logs kanflow-backend 2>&1 | grep -i "scheduler\|cron\|snapshot\|reminder"
```

---

## 10. 실시간 동기화 (WebSocket)

KanFlow는 Socket.io를 통해 보드의 변경사항을 모든 접속자에게 실시간으로 전파합니다.

### 10.1 Socket.io 설정

백엔드 WebSocket Gateway는 NestJS의 `@WebSocketGateway` 데코레이터로 구성됩니다.

**CORS 설정:**

`apps/backend/src/modules/board/board.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
```

운영 환경에서는 `.env`의 `CORS_ORIGIN`을 실제 도메인으로 설정해야 합니다.

**Socket.io 이벤트 목록:**

클라이언트 → 서버 (emit):

| 이벤트 | 설명 | 페이로드 |
|--------|------|---------|
| `joinBoard` | 보드 룸 입장 | `{ boardId }` |
| `leaveBoard` | 보드 룸 퇴장 | `{ boardId }` |
| `joinUser` | 개인 알림 룸 입장 | `{ userId }` |
| `startEditingCard` | 카드 편집 시작 (잠금) | `{ boardId, cardId }` |
| `stopEditingCard` | 카드 편집 완료 (잠금 해제) | `{ boardId, cardId }` |
| `getPresence` | 보드 온라인 사용자 목록 요청 | `{ boardId }` |

서버 → 클라이언트 (on):

| 이벤트 | 설명 |
|--------|------|
| `cardCreated` | 새 카드 생성 |
| `cardUpdated` | 카드 수정 |
| `cardMoved` | 카드 이동 |
| `cardArchived` | 카드 아카이브 |
| `columnCreated` | 새 컬럼 생성 |
| `columnUpdated` | 컬럼 수정 |
| `columnMoved` | 컬럼 순서 변경 |
| `commentAdded` | 댓글 추가 |
| `presenceUpdate` | 보드 접속자 목록 갱신 |
| `cardEditingStarted` | 다른 사용자가 카드 편집 시작 |
| `cardEditingStopped` | 카드 편집 완료 |
| `notification` | 새 알림 수신 |
| `notificationUnread` | 미읽은 알림 발생 |

**WebSocket 연결 디버깅:**

```bash
# 백엔드 로그에서 WebSocket 연결 추적
docker logs -f kanflow-backend 2>&1 | grep -i "socket\|connect\|disconnect\|join"
```

### 10.2 Redis Pub/Sub

현재 구현에서는 단일 서버 환경을 위해 Socket.io의 메모리 어댑터를 사용합니다. 멀티 서버(수평 확장) 환경으로 전환할 경우 Redis Adapter를 사용하십시오.

**Redis 연결 확인:**

```bash
# Redis 컨테이너 접속
docker exec -it kanflow-redis-dev redis-cli

# Redis 상태 확인
redis-cli -h localhost -p 6380 ping
# 응답: PONG

# Redis 메모리 사용량 확인
redis-cli -h localhost -p 6380 info memory

# Redis 운영 환경 접속
redis-cli -h localhost -p 6379 ping
```

**Redis 데이터 관리:**

```bash
# 모든 키 목록 (운영 환경에서 주의하여 사용)
redis-cli -h localhost -p 6379 keys "*"

# 특정 키 값 확인
redis-cli -h localhost -p 6379 get "your-key"

# Redis 캐시 전체 초기화 (주의: 모든 세션/캐시 삭제)
redis-cli -h localhost -p 6379 flushall
```

> **주의:** `flushall` 명령은 Redis의 모든 데이터를 삭제합니다. 운영 환경에서는 반드시 주의하십시오.

---

## 11. 파일 스토리지 (MinIO)

KanFlow는 카드 첨부파일을 MinIO(S3 호환 오브젝트 스토리지)에 저장합니다.

### 11.1 MinIO 설정

MinIO 연결 설정은 환경 변수로 관리합니다:

```dotenv
MINIO_ENDPOINT="localhost"     # 개발: localhost, 운영: 컨테이너명(minio)
MINIO_PORT="9000"
MINIO_USE_SSL="false"          # HTTPS 사용 시 true
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
MINIO_BUCKET="kanflow-uploads"  # 기본 버킷명
```

백엔드가 시작할 때 `MinioService.onModuleInit()`이 자동으로 버킷(`kanflow-uploads`)을 생성합니다.

**MinIO Console (개발 환경):**

브라우저에서 `http://localhost:9001`로 접속합니다.
- 계정: `kanflow_minio`
- 비밀번호: `kanflow_minio_secret_2026`

**MinIO CLI (`mc`) 사용:**

```bash
# mc 별칭 설정 (개발 환경)
mc alias set kanflow-dev http://localhost:9000 kanflow_minio kanflow_minio_secret_2026

# 버킷 목록 확인
mc ls kanflow-dev

# 버킷 내용 확인
mc ls kanflow-dev/kanflow-uploads/

# 파일 통계
mc stat kanflow-dev/kanflow-uploads/

# 컨테이너 내에서 mc 사용 (운영 환경)
docker exec -it kanflow-minio-prod mc alias set prod http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
docker exec -it kanflow-minio-prod mc ls prod/
```

### 11.2 파일 업로드 제한

파일 업로드는 `apps/backend/src/modules/attachment/attachment.controller.ts`에서 `FileInterceptor`로 처리합니다.

기본 파일 업로드 제한 설정 예시:

```typescript
// 파일 크기 제한 설정 (예: 10MB)
@UseInterceptors(FileInterceptor('file', {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 허용 MIME 타입 검사
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Unsupported file type'), false);
    }
  },
}))
```

업로드된 파일의 MinIO 저장 경로 구조:

```
kanflow-uploads/
  attachments/
    {cardId}/
      {uuid}.{ext}
```

### 11.3 스토리지 관리

**사용 중인 스토리지 용량 확인:**

```bash
# Docker 볼륨 용량 확인
docker system df -v | grep kanflow-minio

# MinIO 버킷 용량 확인 (컨테이너 내부)
docker exec kanflow-minio-dev mc du local/kanflow-uploads
```

**고아 파일 정리 (DB에는 없지만 MinIO에는 존재하는 파일):**

```sql
-- DB에 등록된 첨부파일 목록
SELECT file_url FROM attachments ORDER BY created_at ASC;
```

```bash
# MinIO에서 전체 파일 목록 확인
mc ls --recursive kanflow-dev/kanflow-uploads/
```

두 목록을 비교하여 DB에 없는 MinIO 파일을 수동으로 삭제합니다.

**카드 삭제 시 MinIO 파일 처리:**

카드가 삭제될 때 `AttachmentService.delete()`를 통해 MinIO에서도 파일이 삭제됩니다. DB CASCADE 삭제만으로는 MinIO 파일이 삭제되지 않으므로, 직접 DB에서 카드를 삭제하지 마십시오.

> **주의:** DB에서 `DELETE FROM cards WHERE ...`를 직접 실행하면 MinIO에 파일이 남아 스토리지를 낭비합니다. 반드시 API를 통해 삭제하거나, 삭제 전 첨부파일을 API로 먼저 제거하십시오.

---

## 12. 보안

### 12.1 JWT 인증

KanFlow는 JWT(JSON Web Token)와 Passport.js를 사용하여 인증을 처리합니다.

**토큰 발급 흐름:**

1. 로그인 요청 → `POST /api/auth/login`
2. 이메일/비밀번호 검증 → Access Token + Refresh Token 발급
3. Access Token은 API 요청 헤더에 포함: `Authorization: Bearer {token}`
4. Access Token 만료 시 Refresh Token으로 갱신: `POST /api/auth/refresh`

**환경 변수 설정:**

```dotenv
JWT_SECRET="최소-32자-이상의-강력한-랜덤-문자열-여기에-입력"
JWT_EXPIRES_IN="7d"    # Access Token 유효기간
```

JWT Secret 생성 명령:

```bash
# 안전한 랜덤 시크릿 생성
openssl rand -base64 64
# 또는
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Refresh Token 관리:**

Refresh Token은 `users` 테이블의 `refresh_token` 컬럼(bcrypt 해시)에 저장되며, 만료 시각은 `refresh_token_expires_at`에 기록됩니다.

```sql
-- 만료된 Refresh Token 초기화 (비상시)
UPDATE users
SET refresh_token = NULL, refresh_token_expires_at = NULL
WHERE id = 'your-user-id';
```

### 12.2 비밀번호 정책

비밀번호는 bcrypt로 해시되어 저장됩니다. 현재 기본 라운드 수는 10입니다.

비밀번호 변경 API:

```bash
curl -X POST http://localhost:4000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "old-password",
    "newPassword": "new-secure-password"
  }'
```

**강제 비밀번호 초기화 (관리자):**

DB에서 직접 수행 시 bcrypt 해시를 생성하여 업데이트해야 합니다.

```bash
# Node.js로 bcrypt 해시 생성
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('new-password', 10).then(console.log)"
```

```sql
-- 비밀번호 강제 변경 (주의: 해시 값 사용)
UPDATE users
SET password = '$2b$10$...(bcrypt hash)...'
WHERE email = 'user@example.com';
```

### 12.3 CORS 설정

백엔드 `main.ts`에서 CORS를 설정합니다:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});
```

운영 환경에서는 `CORS_ORIGIN`을 정확한 프론트엔드 도메인으로 설정하십시오:

```dotenv
CORS_ORIGIN="https://kanflow.your-domain.com"
```

여러 도메인을 허용해야 할 경우 코드를 수정합니다:

```typescript
app.enableCors({
  origin: ['https://kanflow.your-domain.com', 'https://admin.your-domain.com'],
  credentials: true,
});
```

### 12.4 환경 변수 보안

**권장 사항:**

1. `.env` 파일을 Git에 커밋하지 마십시오.
2. 운영 환경에서는 Docker Secret 또는 Vault 같은 비밀 관리 도구를 사용하십시오.
3. JWT Secret은 최소 32자 이상의 랜덤 문자열을 사용하십시오.
4. MinIO Access Key / Secret Key는 강력한 값으로 변경하십시오.
5. 파일 권한을 제한하십시오.

```bash
# .env 파일 권한을 소유자 읽기 전용으로 제한
chmod 600 .env

# .gitignore에 .env 추가 확인
grep ".env" .gitignore
```

**운영 환경의 민감 변수 예시 (절대 이 값을 그대로 사용하지 마십시오):**

```dotenv
# JWT
JWT_SECRET="prod-$(openssl rand -base64 48)"

# DB (운영)
DATABASE_URL="postgresql://kanflow:STRONG_DB_PASSWORD@postgres:5432/kanflow_prod"

# MinIO
MINIO_ACCESS_KEY="prod-kanflow-access-key"
MINIO_SECRET_KEY="prod-kanflow-secret-key-minimum-32-chars"
```

---

## 13. 유지보수

### 13.1 로그 관리

KanFlow 백엔드는 NestJS의 `Logger` 클래스를 사용합니다. `console.log`는 사용하지 않습니다.

**로그 레벨:**

| 레벨 | 메서드 | 용도 |
|------|--------|------|
| LOG | `logger.log()` | 일반 운영 정보 |
| WARN | `logger.warn()` | 예상 가능한 경고 |
| ERROR | `logger.error()` | 오류 및 예외 |
| DEBUG | `logger.debug()` | 디버깅 정보 |

```bash
# 운영 환경 오류 로그만 필터링
docker logs kanflow-backend 2>&1 | grep "\[ERROR\]"

# 특정 모듈 로그 필터링
docker logs kanflow-backend 2>&1 | grep "\[AutomationService\]"

# 로그를 파일로 저장
docker logs kanflow-backend > /var/log/kanflow/backend-$(date +%Y%m%d).log 2>&1
```

**로그 로테이션 설정 (logrotate):**

```bash
# /etc/logrotate.d/kanflow 파일 생성
cat > /etc/logrotate.d/kanflow << 'EOF'
/var/log/kanflow/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 root root
}
EOF
```

### 13.2 성능 최적화

**PostgreSQL 인덱스 확인:**

주요 쿼리 성능을 위해 다음 인덱스가 스키마에 정의되어 있습니다:

```sql
-- 현재 인덱스 목록 확인
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

주요 인덱스:
- `activities`: `(board_id, created_at)` — 활동 로그 조회 최적화
- `notifications`: `(user_id, is_read)`, `(user_id, created_at)` — 알림 조회 최적화
- `card_status_logs`: `(card_id, moved_at)`, `(board_id, moved_at)` — 리포트 최적화
- `column_snapshots`: `(board_id, date)` — CFD 조회 최적화

**느린 쿼리 모니터링:**

```sql
-- 실행 중인 쿼리 확인
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > INTERVAL '5 seconds'
ORDER BY duration DESC;

-- 테이블 통계 확인
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- VACUUM 실행 (불필요한 튜플 정리)
VACUUM ANALYZE cards;
VACUUM ANALYZE activities;
```

**Redis 메모리 최적화:**

```bash
# Redis 메모리 사용량 상세 확인
redis-cli -h localhost -p 6379 info memory

# 메모리 한도 설정 (redis.conf 또는 환경 변수)
# maxmemory 512mb
# maxmemory-policy allkeys-lru
```

### 13.3 아카이브 자동 삭제 (30일)

아카이브된 보드는 30일 후 자동으로 영구 삭제됩니다. 이 작업은 `BoardScheduler.handleExpiredArchives()`가 매일 새벽 3시에 실행합니다.

```typescript
// Cron: '0 3 * * *' = 매일 새벽 3시
async handleExpiredArchives() {
  const count = await this.boardService.cleanupExpiredArchives();
  // 30일 이상 된 archived_at을 가진 보드를 영구 삭제
}
```

**수동으로 만료 보드 확인 및 삭제:**

```sql
-- 30일 이상 아카이브된 보드 조회
SELECT id, title, archived_at,
       NOW() - archived_at AS archived_for
FROM boards
WHERE archived_at IS NOT NULL
  AND archived_at < NOW() - INTERVAL '30 days';
```

```bash
# 스케줄러 실행 로그 확인
docker logs kanflow-backend 2>&1 | grep "archive\|cleanup\|expired"
```

### 13.4 트러블슈팅 가이드

**문제 1: 백엔드 시작 실패 - DB 연결 오류**

```
Error: Can't reach database server at `localhost:5432`
```

해결:
```bash
# 1. DB 컨테이너 상태 확인
docker ps --filter "name=kanflow-postgres"

# 2. 헬스체크 상태 확인
docker inspect --format='{{.State.Health.Status}}' kanflow-postgres-dev

# 3. DB 컨테이너 재시작
docker restart kanflow-postgres-dev

# 4. DATABASE_URL 포트 확인 (개발: 5433, 운영: 5432)
echo $DATABASE_URL
```

**문제 2: Prisma 마이그레이션 실패**

```
Error: P3009 - migrate found failed migrations
```

해결:
```bash
# 마이그레이션 상태 확인
DATABASE_URL="..." npx prisma migrate status

# 실패한 마이그레이션 해결
DATABASE_URL="..." npx prisma migrate resolve --rolled-back "migration_name"

# 마이그레이션 재실행
DATABASE_URL="..." npx prisma migrate deploy
```

**문제 3: MinIO 연결 실패**

```
Error: connect ECONNREFUSED 127.0.0.1:9000
```

해결:
```bash
# MinIO 컨테이너 상태 확인
docker ps --filter "name=kanflow-minio"
docker logs kanflow-minio-dev

# MinIO 컨테이너 재시작
docker restart kanflow-minio-dev

# MinIO 포트 접근 확인
curl http://localhost:9000/minio/health/live
```

**문제 4: WebSocket 연결 안 됨**

```
WebSocket connection failed
```

해결:
```bash
# 1. 백엔드 포트 열려있는지 확인
curl http://localhost:4000/api

# 2. CORS_ORIGIN 설정 확인
docker exec kanflow-backend env | grep CORS

# 3. 방화벽 포트 확인
sudo ufw status
sudo ufw allow 4000

# 4. Nginx 프록시 WebSocket 설정 확인 (운영 환경)
grep -i "websocket\|upgrade" docker/prod/nginx.conf
```

**문제 5: 카드 이동 후 자동화 미실행**

해결:
```bash
# 1. 자동화 규칙 활성화 상태 확인
# (API 또는 DB에서 is_enabled 확인)
docker exec -it kanflow-postgres-prod psql -U kanflow -d kanflow_prod \
  -c "SELECT name, is_enabled FROM automation_rules WHERE board_id='your-board-id';"

# 2. 실행 로그 확인
docker exec -it kanflow-postgres-prod psql -U kanflow -d kanflow_prod \
  -c "SELECT status, details, created_at FROM automation_execution_logs ORDER BY created_at DESC LIMIT 10;"

# 3. 백엔드 오류 로그 확인
docker logs kanflow-backend 2>&1 | grep -i "automation\|error"
```

**문제 6: CFD 차트 데이터 없음**

```
리포트 페이지에 CFD 데이터가 표시되지 않음
```

해결:
```bash
# 스냅샷 데이터 확인
docker exec -it kanflow-postgres-prod psql -U kanflow -d kanflow_prod \
  -c "SELECT COUNT(*), MIN(date), MAX(date) FROM column_snapshots WHERE board_id='your-board-id';"

# 스냅샷이 없으면 수동으로 트리거
# BoardScheduler.handleDailySnapshot()이 매일 자정 실행되므로
# 최초 데이터는 다음 날 자정 이후 생성됨
# 즉시 필요하면 SQL로 수동 삽입 (섹션 8.2 참조)
```

---

## 14. API 문서

### 14.1 Swagger UI 접속

KanFlow 백엔드는 Swagger(OpenAPI 3.0) 문서를 자동으로 생성합니다.

**접속 URL:**

| 환경 | URL |
|------|-----|
| 개발 환경 | http://localhost:4000/api/docs |
| 운영 환경 | http://your-server:4000/api/docs |

**Swagger UI에서 API 테스트:**

1. `http://localhost:4000/api/docs` 접속
2. 우상단 "Authorize" 버튼 클릭
3. `POST /api/auth/login`으로 로그인하여 Access Token 획득
4. 획득한 토큰을 "Authorize" 다이얼로그의 `Bearer` 필드에 입력
5. 잠금 아이콘이 잠긴 상태로 변경되면 인증 완료
6. 원하는 API 엔드포인트를 클릭하여 테스트

> **주의:** 운영 환경에서 Swagger UI를 외부에 노출하지 않으려면 Nginx에서 `/api/docs` 경로에 대한 접근을 IP 화이트리스트로 제한하십시오.

```nginx
# nginx.conf 예시 - Swagger UI 접근 제한
location /api/docs {
    allow 192.168.1.0/24;   # 내부망만 허용
    deny all;
    proxy_pass http://backend:4000;
}
```

### 14.2 주요 API 엔드포인트 목록

모든 API는 `/api` 프리픽스로 시작합니다.

**인증 (Auth)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 새 사용자 등록 |
| POST | `/api/auth/login` | 로그인 (JWT 토큰 발급) |
| POST | `/api/auth/refresh` | Access Token 갱신 |
| POST | `/api/auth/logout` | 로그아웃 (Refresh Token 무효화) |
| POST | `/api/auth/change-password` | 비밀번호 변경 |

**사용자 (User)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/users/me` | 내 프로필 조회 |
| PATCH | `/api/users/me` | 프로필 수정 |

**워크스페이스 (Workspace)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/workspaces` | 내 워크스페이스 목록 |
| POST | `/api/workspaces` | 워크스페이스 생성 |
| GET | `/api/workspaces/:id` | 워크스페이스 상세 |
| PATCH | `/api/workspaces/:id` | 워크스페이스 수정 |
| DELETE | `/api/workspaces/:id` | 워크스페이스 삭제 |
| GET | `/api/workspaces/:id/members` | 멤버 목록 |
| POST | `/api/workspaces/:id/members` | 멤버 추가 |
| PATCH | `/api/workspaces/:id/members/:userId/role` | 멤버 역할 변경 |
| DELETE | `/api/workspaces/:id/members/:userId` | 멤버 제거 |

**보드 (Board)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/workspaces/:id/boards` | 보드 목록 |
| POST | `/api/workspaces/:id/boards` | 보드 생성 |
| GET | `/api/boards/:id` | 보드 상세 |
| PATCH | `/api/boards/:id` | 보드 수정 |
| DELETE | `/api/boards/:id` | 보드 삭제 |
| PATCH | `/api/boards/:id/archive` | 보드 아카이브 |
| PATCH | `/api/boards/:id/restore` | 아카이브 복원 |
| POST | `/api/boards/:id/favorite` | 즐겨찾기 추가 |
| DELETE | `/api/boards/:id/favorite` | 즐겨찾기 제거 |
| GET | `/api/boards/:id/export` | 보드 Export |
| GET | `/api/boards/:id/stats` | 보드 통계 |

**컬럼 (Column)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/boards/:boardId/columns` | 컬럼 생성 |
| PATCH | `/api/columns/:id` | 컬럼 수정 |
| DELETE | `/api/columns/:id` | 컬럼 삭제 |
| PATCH | `/api/columns/:id/move` | 컬럼 순서 이동 |

**카드 (Card)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/boards/:boardId/cards` | 카드 목록 |
| POST | `/api/boards/:boardId/cards` | 카드 생성 |
| GET | `/api/cards/:id` | 카드 상세 |
| PATCH | `/api/cards/:id` | 카드 수정 |
| DELETE | `/api/cards/:id` | 카드 삭제 |
| PATCH | `/api/cards/:id/move` | 카드 이동 |
| POST | `/api/cards/:id/archive` | 카드 아카이브 |
| POST | `/api/cards/:id/assignees` | 담당자 추가 |
| DELETE | `/api/cards/:id/assignees/:userId` | 담당자 제거 |

**자동화 (Automation)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/boards/:boardId/automations` | 규칙 목록 |
| POST | `/api/boards/:boardId/automations` | 규칙 생성 |
| PATCH | `/api/boards/:boardId/automations/:id` | 규칙 수정 |
| DELETE | `/api/boards/:boardId/automations/:id` | 규칙 삭제 |
| PATCH | `/api/boards/:boardId/automations/:id/toggle` | 활성화 토글 |
| GET | `/api/boards/:boardId/automations/:id/logs` | 실행 로그 |

**리포트 (Report)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/boards/:boardId/reports/cfd` | CFD 데이터 |
| GET | `/api/boards/:boardId/reports/lead-time` | 리드타임 데이터 |
| GET | `/api/boards/:boardId/reports/throughput` | 처리량 데이터 |

**알림 (Notification)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/notifications` | 알림 목록 |
| GET | `/api/notifications/unread-count` | 미읽은 알림 수 |
| PATCH | `/api/notifications/:id/read` | 알림 읽음 처리 |
| PATCH | `/api/notifications/read-all` | 전체 읽음 처리 |
| GET | `/api/notifications/settings` | 알림 설정 조회 |
| PATCH | `/api/notifications/settings/:type` | 알림 설정 변경 |

**첨부파일 (Attachment)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/cards/:cardId/attachments` | 파일 업로드 |
| GET | `/api/cards/:cardId/attachments` | 첨부파일 목록 |
| DELETE | `/api/attachments/:id` | 첨부파일 삭제 |
| GET | `/api/attachments/:id/url` | 파일 다운로드 URL (Presigned) |

**템플릿 (Template)**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/templates` | 템플릿 목록 |
| POST | `/api/templates` | 템플릿 생성 |
| DELETE | `/api/templates/:id` | 템플릿 삭제 |
| POST | `/api/templates/:id/apply` | 보드에 템플릿 적용 |

---

*본 메뉴얼은 KanFlow v1.0.0 기준으로 작성되었습니다.*
*최신 API 명세는 Swagger UI(`/api/docs`)를 참조하십시오.*
