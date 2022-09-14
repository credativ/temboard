/* global instances, Vue */
import _ from 'lodash'
import moment from 'moment'
import Dygraph from 'dygraphs'
import 'dygraphs/dist/dygraph.css'
import Vue from 'vue/dist/vue.esm'
import VueRouter from 'vue-router'

import './fscreen.js'
import Checks from './components/Checks.vue'
import Sparkline from './components/Sparkline.vue'


Vue.use(VueRouter)


var refreshInterval = 60 * 1000;


window.instancesVue = new Vue({
  el: '#instances',
  router: new VueRouter(),
  components: {
    checks: Checks,
    sparkline: Sparkline
  },
  data: function() {
    var groupsFilter = [];
    if (this.$route.query.groups) {
      groupsFilter = this.$route.query.groups.split(',');
    }
    return {
      loading: true,
      instances: [],
      search: this.$route.query.q,
      sort: this.$route.query.sort || 'status',
      groups: groups,
      groupsFilter: groupsFilter
    }
  },
  methods: {
    hasMonitoring: function(instance) {
      return instance.plugins.indexOf('monitoring') != -1;
    },
    toggleGroupFilter: function(group, e) {
      e.preventDefault();
      var index = this.groupsFilter.indexOf(group);
      if (index != -1) {
        this.groupsFilter.splice(index, 1);
      } else {
        this.groupsFilter.push(group);
      }
    },
    changeSort: function(sort, e) {
      e.preventDefault();
      this.sort = sort;
    },
    getStatusValue: getStatusValue
  },
  computed: {
    filteredInstances: function() {
      var self = this;
      var searchRegex = new RegExp(self.search, 'i');
      var filtered = this.instances.filter(function(instance) {
        return searchRegex.test(instance.hostname) ||
                searchRegex.test(instance.agent_address) ||
                searchRegex.test(instance.pg_data) ||
                searchRegex.test(instance.pg_port) ||
                searchRegex.test(instance.pg_version);
      });
      var sorted;
      if (this.sort == 'status') {
        sorted = sortByStatus(filtered);
      } else {
        sorted = _.sortBy(filtered, this.sort, 'asc');
      }

      var groupFiltered = sorted.filter((instance) => {
        if (!this.groupsFilter.length) {
          return true;
        }
        return this.groupsFilter.every((group) => {
          return instance.groups.indexOf(group) != -1;
        });
      });
      return groupFiltered;
    }
  },
  watch: {
    search: function(newVal) {
      this.$router.replace({ query: _.assign({}, this.$route.query, {q: newVal })} );
    },
    sort: function(newVal) {
      this.$router.replace({ query: _.assign({}, this.$route.query, {sort: newVal })} );
    },
    groupsFilter: function(newVal) {
      this.$router.replace({ query: _.assign({}, this.$route.query, {groups: newVal.join(',') })} );
    }
  }
});

fetchInstances.call(instancesVue);
window.setInterval(function() {
  fetchInstances.call(instancesVue);
}, refreshInterval);

function sortByStatus(items) {
  return items.sort(function(a, b) {
    return getStatusValue(b) - getStatusValue(a);
  });
}

/*
  * Util to compute a global status value given an instance
  */
function getStatusValue(instance) {
  var checks = getChecksCount(instance);
  var value = 0;
  if (checks.CRITICAL) {
    value += checks.CRITICAL * 1000000;
  }
  if (checks.WARNING) {
    value += checks.WARNING* 1000;
  }
  if (checks.UNDEF) {
    value += checks.UNDEF;
  }
  return value;
}

function fetchInstances() {
  $.ajax(instancesUrl)
    .success(function(data) {
      this.instances = data;
      this.loading = false;
      Vue.nextTick(function() {
        $('[data-toggle="popover"]').popover();
      });
    }.bind(this));
}

function getChecksCount(instance) {
  var count = _.countBy(
    instance.checks.map(
      function(state) { return state.state; }
    )
  );
  return count;
}

$('.fullscreen').on('click', function(e) {
  e.preventDefault();
  $(this).addClass('d-none');
  const el = $(this).parents('.container-fluid')[0]
  fscreen.requestFullscreen(el);
});

fscreen.onfullscreenchange = function onFullScreenChange(event) {
  if (!fscreen.fullscreenElement) {
    $('.fullscreen').removeClass('d-none');
  }
}

// hide fullscreen button if not supported
$('.fullscreen').toggleClass('d-none', !fscreen.fullscreenEnabled);