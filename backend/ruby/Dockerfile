FROM ruby:3.3-alpine AS base
RUN apk add --no-cache build-base sqlite-dev sqlite-libs

WORKDIR /app

COPY Gemfile .
RUN bundle install --without development test

COPY . .

EXPOSE 3000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb", "config.ru"]
