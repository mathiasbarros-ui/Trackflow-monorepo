FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

RUN find /etc/apt -type f \( -name '*.list' -o -name '*.sources' \) \
    -exec grep -l 'dl.yarnpkg.com' {} + \
    | xargs -r rm -f