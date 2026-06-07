port        ENV.fetch('PORT', 3000)
environment ENV.fetch('RACK_ENV', 'production')
threads     1, ENV.fetch('RAILS_MAX_THREADS', 4)

# workers je na voljo samo na Unix/Linux (Docker); na Windows se ignorira
if RUBY_PLATFORM !~ /mingw|mswin/
  workers ENV.fetch('WEB_CONCURRENCY', 2)
  preload_app!
end
