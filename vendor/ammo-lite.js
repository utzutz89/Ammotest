(function(global){
  function btVector3(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  btVector3.prototype={setValue(x,y,z){this.x=x;this.y=y;this.z=z}};

  function btRigidBody(ci){
    this.mass=ci.mass||0;
    this.position=ci.position||new btVector3();
    this.velocity=ci.velocity||new btVector3();
    this.radius=ci.radius||1;
    this.friction=ci.friction||0.15;
    this.restitution=ci.restitution||0.2;
    this.userData=ci.userData||null;
  }

  function btDiscreteDynamicsWorld(){this.bodies=[];this.gravity=new btVector3(0,0,0)}
  btDiscreteDynamicsWorld.prototype={
    setGravity(g){this.gravity=g},
    addRigidBody(b){this.bodies.push(b)},
    removeRigidBody(b){this.bodies=this.bodies.filter(v=>v!==b)},
    stepSimulation(dt){
      for(const b of this.bodies){
        if(b.mass<=0) continue;
        b.velocity.x += this.gravity.x*dt;
        b.velocity.z += this.gravity.z*dt;
        b.position.x += b.velocity.x*dt;
        b.position.z += b.velocity.z*dt;
        b.velocity.x *= (1-b.friction*dt*4);
        b.velocity.z *= (1-b.friction*dt*4);
      }
    }
  };

  global.Ammo=()=>Promise.resolve({btVector3,btRigidBody,btDiscreteDynamicsWorld});
})(window);
