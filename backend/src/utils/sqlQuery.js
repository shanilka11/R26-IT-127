export class SqlQuery {
  constructor(executor) {
    this.executor = executor;
    this.sortSpec = null;
    this.limitValue = null;
  }

  sort(spec) {
    this.sortSpec = spec;
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  lean() {
    return this.executor({ sort: this.sortSpec, limit: this.limitValue });
  }

  then(resolve, reject) {
    return this.lean().then(resolve, reject);
  }
}
